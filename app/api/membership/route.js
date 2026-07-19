import { NextResponse } from "next/server";
import { getSession } from "../../../lib/auth";
import { hasDatabase, query, withTransaction } from "../../../lib/db";
import { getPlan } from "../../../lib/plans";
import { getStripe, hasStripe } from "../../../lib/stripe";
import { subscriptionPeriodEnd, updateSubscriptionPlan } from "../../../lib/subscriptions";

function previewMembership(body) {
  return {
    id: "demo-membership",
    plan_code: body.planCode || "reserve",
    vehicle_count: Number(body.vehicleCount || 2),
    status: "active",
    cancel_at_period_end: body.action === "cancel",
    current_period_end: new Date(Date.now() + 21 * 86400000).toISOString()
  };
}

export async function PATCH(request) {
  const session = await getSession();
  if (!session && hasDatabase()) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  try {
    const body = await request.json();
    const action = ["update", "cancel", "resume"].includes(body.action) ? body.action : "update";
    if (!hasDatabase()) {
      return NextResponse.json({ membership: previewMembership({ ...body, action }), coveredVehicleIds: body.vehicleIds || [], preview: true });
    }
    if (!hasStripe()) return NextResponse.json({ error: "Stripe billing is not configured." }, { status: 503 });

    const membershipResult = await query(
      "SELECT * FROM memberships WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
      [session.id]
    );
    const membership = membershipResult.rows[0];
    if (!membership) return NextResponse.json({ error: "No membership was found for this account." }, { status: 404 });

    const stripe = getStripe();
    if (action === "cancel" || action === "resume") {
      const updated = await stripe.subscriptions.update(membership.stripe_subscription_id, {
        cancel_at_period_end: action === "cancel"
      });
      const result = await query(
        `UPDATE memberships SET cancel_at_period_end = $1, status = $2, current_period_end = $3, updated_at = NOW()
         WHERE id = $4 AND user_id = $5 RETURNING *`,
        [Boolean(updated.cancel_at_period_end), updated.status, subscriptionPeriodEnd(updated), membership.id, session.id]
      );
      return NextResponse.json({ membership: result.rows[0] });
    }

    const plan = getPlan(String(body.planCode || ""));
    const vehicleCount = Number(body.vehicleCount);
    const vehicleIds = [...new Set(Array.isArray(body.vehicleIds) ? body.vehicleIds.map(String) : [])];
    if (!plan || !Number.isInteger(vehicleCount) || vehicleCount < plan.minVehicles || vehicleCount > plan.maxVehicles) {
      return NextResponse.json({ error: "Choose a valid plan and vehicle count." }, { status: 400 });
    }
    if (vehicleIds.length > vehicleCount) {
      return NextResponse.json({ error: "Assigned vehicles cannot exceed the membership vehicle count." }, { status: 400 });
    }
    if (vehicleIds.length) {
      const owned = await query("SELECT id FROM vehicles WHERE user_id = $1 AND id = ANY($2::text[])", [session.id, vehicleIds]);
      if (owned.rows.length !== vehicleIds.length) return NextResponse.json({ error: "One or more vehicles could not be assigned." }, { status: 400 });
    }

    const updated = await updateSubscriptionPlan({
      stripe,
      subscriptionId: membership.stripe_subscription_id,
      currentPlanCode: membership.plan_code,
      plan,
      vehicleCount,
      metadata: { user_id: session.id, plan_code: plan.code, vehicle_count: String(vehicleCount) }
    });

    const savedMembership = await withTransaction(async (transactionQuery) => {
      const result = await transactionQuery(
        `UPDATE memberships SET
           plan_code = $1, vehicle_count = $2, status = $3, cancel_at_period_end = $4,
           current_period_end = $5, updated_at = NOW()
         WHERE id = $6 AND user_id = $7 RETURNING *`,
        [plan.code, vehicleCount, updated.status, Boolean(updated.cancel_at_period_end), subscriptionPeriodEnd(updated), membership.id, session.id]
      );
      await transactionQuery("DELETE FROM membership_vehicles WHERE membership_id = $1 AND user_id = $2", [membership.id, session.id]);
      if (vehicleIds.length) {
        await transactionQuery(
          `INSERT INTO membership_vehicles (membership_id, vehicle_id, user_id)
           SELECT $1, assigned.vehicle_id, $2 FROM UNNEST($3::text[]) AS assigned(vehicle_id)`,
          [membership.id, session.id, vehicleIds]
        );
      }
      return result.rows[0];
    });

    return NextResponse.json({ membership: savedMembership, coveredVehicleIds: vehicleIds });
  } catch (error) {
    console.error("Membership update failed", error);
    return NextResponse.json({ error: "Membership changes could not be saved." }, { status: 500 });
  }
}
