import { NextResponse } from "next/server";
import { getCurrentUser, getSession } from "../../../lib/auth";
import { hasDatabase, query } from "../../../lib/db";
import { getPlan } from "../../../lib/plans";
import { appUrl, getStripe, hasStripe } from "../../../lib/stripe";

export async function POST(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Create an account or sign in before checkout." }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ error: "Connect PostgreSQL before accepting live memberships." }, { status: 503 });
  if (!hasStripe()) return NextResponse.json({ error: "Stripe sandbox keys have not been configured yet." }, { status: 503 });

  try {
    const body = await request.json();
    const plan = getPlan(String(body.planCode || ""));
    const vehicleCount = Number(body.vehicleCount);
    if (!plan || !Number.isInteger(vehicleCount) || vehicleCount < plan.minVehicles || vehicleCount > plan.maxVehicles) {
      return NextResponse.json({ error: "Choose a valid plan and vehicle count." }, { status: 400 });
    }

    const user = await getCurrentUser(session);
    if (!user) return NextResponse.json({ error: "Account was not found." }, { status: 404 });
    const stripe = getStripe();
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ name: user.name, email: user.email, metadata: { user_id: user.id } });
      customerId = customer.id;
      await query("UPDATE users SET stripe_customer_id = $1, updated_at = NOW() WHERE id = $2", [customerId, user.id]);
    }

    const baseUrl = appUrl(request);
    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      phone_number_collection: { enabled: true },
      line_items: [{
        quantity: vehicleCount,
        price_data: {
          currency: "usd",
          unit_amount: plan.price * 100,
          recurring: { interval: "month" },
          product_data: {
            name: `Lucent ${plan.name} vehicle care`,
            description: `${plan.visits} - ${plan.audience}`,
            metadata: { plan_code: plan.code }
          }
        }
      }],
      metadata: { user_id: user.id, plan_code: plan.code, vehicle_count: String(vehicleCount) },
      subscription_data: { metadata: { user_id: user.id, plan_code: plan.code, vehicle_count: String(vehicleCount) } },
      success_url: `${baseUrl}/portal/membership?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/portal/membership?checkout=cancelled`
    });

    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    console.error("Stripe checkout failed", error);
    return NextResponse.json({ error: "Stripe checkout could not be started." }, { status: 500 });
  }
}
