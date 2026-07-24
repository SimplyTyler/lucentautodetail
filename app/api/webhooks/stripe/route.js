import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { hasDatabase, query } from "../../../../lib/db";
import { getStripe, hasStripe } from "../../../../lib/stripe";

export const dynamic = "force-dynamic";

async function syncSubscription(subscription) {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
  let userId = subscription.metadata?.user_id;
  if (!userId && customerId) {
    const user = await query("SELECT id FROM users WHERE stripe_customer_id = $1 LIMIT 1", [customerId]);
    userId = user.rows[0]?.id;
  }
  if (!userId || !customerId) return;

  const firstItem = subscription.items?.data?.[0];
  const periodEnd = subscription.current_period_end || firstItem?.current_period_end;
  const vehicleCount = Number(firstItem?.quantity || subscription.metadata?.vehicle_count || 1);
  const planCode = subscription.metadata?.plan_code || firstItem?.price?.product?.metadata?.plan_code || "drive";

  await query(
    `INSERT INTO memberships (
       id, user_id, stripe_subscription_id, stripe_customer_id, plan_code, vehicle_count, status, cancel_at_period_end, current_period_end
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (stripe_subscription_id) DO UPDATE SET
       plan_code = EXCLUDED.plan_code,
       vehicle_count = EXCLUDED.vehicle_count,
       status = EXCLUDED.status,
       cancel_at_period_end = EXCLUDED.cancel_at_period_end,
       current_period_end = EXCLUDED.current_period_end,
       updated_at = NOW()`,
    [randomUUID(), userId, subscription.id, customerId, planCode, vehicleCount, subscription.status, Boolean(subscription.cancel_at_period_end), periodEnd ? new Date(periodEnd * 1000) : null]
  );
  await query("UPDATE users SET stripe_customer_id = $1, updated_at = NOW() WHERE id = $2", [customerId, userId]);
}

export async function POST(request) {
  if (!hasStripe() || !process.env.STRIPE_WEBHOOK_SECRET || !hasDatabase()) {
    return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  let event;
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    return NextResponse.json({ error: `Invalid webhook signature: ${error.message}` }, { status: 400 });
  }

  try {
    const inserted = await query(
      "INSERT INTO stripe_webhook_events (event_id, event_type) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING event_id",
      [event.id, event.type]
    );
    if (!inserted.rows[0]) return NextResponse.json({ received: true, duplicate: true });

    if (["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"].includes(event.type)) {
      await syncSubscription(event.data.object);
    }

    if (event.type === "checkout.session.completed" && event.data.object.subscription) {
      const subscriptionId = typeof event.data.object.subscription === "string" ? event.data.object.subscription : event.data.object.subscription.id;
      await syncSubscription(await getStripe().subscriptions.retrieve(subscriptionId));
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    await query("DELETE FROM stripe_webhook_events WHERE event_id = $1", [event.id]).catch(() => {});
    console.error("Stripe webhook processing failed", error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
