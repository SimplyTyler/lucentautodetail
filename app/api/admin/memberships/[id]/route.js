import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "../../../../../lib/admin";
import { hasDatabase, query, withTransaction } from "../../../../../lib/db";
import { getPlan } from "../../../../../lib/plans";
import { getStripe, hasStripe } from "../../../../../lib/stripe";
import { subscriptionPeriodEnd, updateSubscriptionPlan } from "../../../../../lib/subscriptions";

function previewMembership(id, body) {
  return {
    id,
    plan_code: body.planCode || "drive",
    vehicle_count: Number(body.vehicleCount || 1),
    status: "active",
    cancel_at_period_end: body.action === "cancel",
    current_period_end: new Date(Date.now() + 21 * 86400000).toISOString()
  };
}

export async function PATCH(request, { params }) {
  const admin = await authorizeAdminRequest();
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  try {
    const { id } = await params;
    const body = await request.json();
    const action = ["update", "cancel", "resume", "sync"].includes(body.action) ? body.action : "update";
    if (!hasDatabase()) return NextResponse.json({ membership: previewMembership(id, { ...body, action }), coveredVehicleIds: body.vehicleIds || [], preview: true });
    if (!hasStripe()) return NextResponse.json({ error: "Stripe billing is not configured." }, { status: 503 });

    const membershipResult = await query("SELECT * FROM memberships WHERE id = $1", [id]);
    const membership = membershipResult.rows[0];
    if (!membership) return NextResponse.json({ error: "Membership was not found." }, { status: 404 });
    const stripe = getStripe();

    if (["cancel", "resume", "sync"].includes(action)) {
      const subscription = action === "sync"
        ? await stripe.subscriptions.retrieve(membership.stripe_subscription_id)
        : await stripe.subscriptions.update(membership.stripe_subscription_id, { cancel_at_period_end: action === "cancel" });
      const result = await query(
        `UPDATE memberships SET cancel_at_period_end = $1, status = $2, current_period_end = $3, updated_at = NOW()
         WHERE id = $4 RETURNING *`,
        [Boolean(subscription.cancel_at_period_end), subscription.status, subscriptionPeriodEnd(subscription), id]
      );
      return NextResponse.json({ membership: result.rows[0] });
    }

    const plan = getPlan(String(body.planCode || ""));
    const vehicleCount = Number(body.vehicleCount);
    const vehicleIds = [...new Set(Array.isArray(body.vehicleIds) ? body.vehicleIds.map(String) : [])];
    if (!plan || !Number.isInteger(vehicleCount) || vehicleCount < plan.minVehicles || vehicleCount > plan.maxVehicles) {
      return NextResponse.json({ error: "Choose a valid plan and care-slot count." }, { status: 400 });
    }
    if (vehicleIds.length > vehicleCount) return NextResponse.json({ error: "Assigned vehicles cannot exceed care slots." }, { status: 400 });
    if (vehicleIds.length) {
      const owned = await query("SELECT id FROM vehicles WHERE user_id = $1 AND id = ANY($2::text[])", [membership.user_id, vehicleIds]);
      if (owned.rows.length !== vehicleIds.length) return NextResponse.json({ error: "One or more vehicles do not belong to this customer." }, { status: 400 });
    }

    const updated = await updateSubscriptionPlan({
      stripe,
      subscriptionId: membership.stripe_subscription_id,
      currentPlanCode: membership.plan_code,
      plan,
      vehicleCount,
      metadata: { user_id: membership.user_id, plan_code: plan.code, vehicle_count: String(vehicleCount), updated_by: admin.id }
    });

    const savedMembership = await withTransaction(async (transactionQuery) => {
      const result = await transactionQuery(
        `UPDATE memberships SET plan_code = $1, vehicle_count = $2, status = $3,
           cancel_at_period_end = $4, current_period_end = $5, updated_at = NOW()
         WHERE id = $6 RETURNING *`,
        [plan.code, vehicleCount, updated.status, Boolean(updated.cancel_at_period_end), subscriptionPeriodEnd(updated), id]
      );
      await transactionQuery("DELETE FROM membership_vehicles WHERE membership_id = $1", [id]);
      if (vehicleIds.length) {
        await transactionQuery(
          `INSERT INTO membership_vehicles (membership_id, vehicle_id, user_id)
           SELECT $1, assigned.vehicle_id, $2 FROM UNNEST($3::text[]) AS assigned(vehicle_id)`,
          [id, membership.user_id, vehicleIds]
        );
      }
      return result.rows[0];
    });
    return NextResponse.json({ membership: savedMembership, coveredVehicleIds: vehicleIds });
  } catch (error) {
    console.error("Admin membership update failed", error);
    return NextResponse.json({ error: "Membership could not be updated." }, { status: 500 });
  }
}
