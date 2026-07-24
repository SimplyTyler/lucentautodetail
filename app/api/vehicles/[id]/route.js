import { NextResponse } from "next/server";
import { getSession } from "../../../../lib/auth";
import { hasDatabase, query } from "../../../../lib/db";
import { normalizeVehicleInput } from "../../../../lib/vehicle";

export async function PATCH(request, { params }) {
  const session = await getSession();
  if (!session && hasDatabase()) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  try {
    const { id } = await params;
    const normalized = normalizeVehicleInput(await request.json());
    if (normalized.error) return NextResponse.json({ error: normalized.error }, { status: 400 });
    const value = normalized.value;

    if (!hasDatabase()) return NextResponse.json({ vehicle: { id, user_id: "preview", ...value } });
    const result = await query(
      `UPDATE vehicles SET
         year = $1, make = $2, model = $3, nickname = $4, color = $5, vehicle_type = $6,
         license_plate = $7, plate_state = $8, vin_last_six = $9, service_notes = $10, updated_at = NOW()
       WHERE id = $11 AND user_id = $12 RETURNING *`,
      [value.year, value.make, value.model, value.nickname, value.color, value.vehicle_type, value.license_plate, value.plate_state, value.vin_last_six, value.service_notes, id, session.id]
    );
    if (!result.rows[0]) return NextResponse.json({ error: "Vehicle was not found." }, { status: 404 });
    return NextResponse.json({ vehicle: result.rows[0] });
  } catch (error) {
    console.error("Vehicle update failed", error);
    return NextResponse.json({ error: "Vehicle could not be updated." }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  const session = await getSession();
  if (!session && hasDatabase()) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { id } = await params;
  if (hasDatabase()) await query("DELETE FROM vehicles WHERE id = $1 AND user_id = $2", [id, session.id]);
  return NextResponse.json({ ok: true });
}
