import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "../../../../../lib/admin";
import { hasDatabase, query } from "../../../../../lib/db";
import { normalizeVehicleInput } from "../../../../../lib/vehicle";

export async function PATCH(request, { params }) {
  const admin = await authorizeAdminRequest();
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  try {
    const { id } = await params;
    const normalized = normalizeVehicleInput(await request.json());
    if (normalized.error) return NextResponse.json({ error: normalized.error }, { status: 400 });
    const value = normalized.value;
    if (!hasDatabase()) return NextResponse.json({ vehicle: { id, ...value }, preview: true });

    const result = await query(
      `UPDATE vehicles SET
         year = $1, make = $2, model = $3, nickname = $4, color = $5, vehicle_type = $6,
         license_plate = $7, plate_state = $8, vin_last_six = $9, service_notes = $10, updated_at = NOW()
       WHERE id = $11 RETURNING *`,
      [value.year, value.make, value.model, value.nickname, value.color, value.vehicle_type, value.license_plate, value.plate_state, value.vin_last_six, value.service_notes, id]
    );
    if (!result.rows[0]) return NextResponse.json({ error: "Vehicle was not found." }, { status: 404 });
    return NextResponse.json({ vehicle: result.rows[0] });
  } catch (error) {
    console.error("Admin vehicle update failed", error);
    return NextResponse.json({ error: "Vehicle could not be updated." }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  const admin = await authorizeAdminRequest();
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const { id } = await params;
  if (!hasDatabase()) return NextResponse.json({ ok: true, preview: true });
  const result = await query("DELETE FROM vehicles WHERE id = $1 RETURNING id", [id]);
  if (!result.rows[0]) return NextResponse.json({ error: "Vehicle was not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
