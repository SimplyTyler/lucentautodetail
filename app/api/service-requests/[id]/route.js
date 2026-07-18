import { NextResponse } from "next/server";
import { getSession } from "../../../../lib/auth";
import { hasDatabase, query } from "../../../../lib/db";
import { normalizeVisitInput } from "../../../../lib/visits";

export async function PATCH(request, { params }) {
  const session = await getSession();
  if (!session && hasDatabase()) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json();

    if (body.action === "cancel") {
      if (!hasDatabase()) return NextResponse.json({ request: { id, status: "cancelled" } });
      const result = await query(
        `UPDATE service_requests SET status = 'cancelled', updated_at = NOW()
         WHERE id = $1 AND user_id = $2 AND status IN ('requested', 'confirmed') RETURNING *`,
        [id, session.id]
      );
      if (!result.rows[0]) return NextResponse.json({ error: "This visit can no longer be cancelled." }, { status: 409 });
      return NextResponse.json({ request: result.rows[0] });
    }

    const normalized = normalizeVisitInput(body);
    if (normalized.error) return NextResponse.json({ error: normalized.error }, { status: 400 });
    const value = normalized.value;

    if (!hasDatabase()) return NextResponse.json({ request: { id, status: "requested", ...value } });
    const vehicle = await query("SELECT id, make, model, nickname FROM vehicles WHERE id = $1 AND user_id = $2", [value.vehicle_id, session.id]);
    if (!vehicle.rows[0]) return NextResponse.json({ error: "Vehicle was not found." }, { status: 404 });
    const result = await query(
      `UPDATE service_requests SET
         vehicle_id = $1, preferred_date = $2, preferred_window = $3, service_type = $4,
         service_location = $5, service_address = $6, notes = $7, status = 'requested', updated_at = NOW()
       WHERE id = $8 AND user_id = $9 AND status IN ('requested', 'confirmed') RETURNING *`,
      [value.vehicle_id, value.preferred_date, value.preferred_window, value.service_type, value.service_location, value.service_address, value.notes, id, session.id]
    );
    if (!result.rows[0]) return NextResponse.json({ error: "This visit can no longer be changed." }, { status: 409 });
    return NextResponse.json({ request: { ...result.rows[0], make: vehicle.rows[0].make, model: vehicle.rows[0].model, nickname: vehicle.rows[0].nickname } });
  } catch (error) {
    console.error("Visit update failed", error);
    return NextResponse.json({ error: "Visit request could not be updated." }, { status: 500 });
  }
}
