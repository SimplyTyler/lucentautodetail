import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "../../../../lib/admin";
import { hasDatabase, query } from "../../../../lib/db";
import { normalizeVehicleInput } from "../../../../lib/vehicle";

export async function POST(request) {
  const admin = await authorizeAdminRequest();
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  try {
    const body = await request.json();
    const userId = String(body.userId || "").trim();
    const normalized = normalizeVehicleInput(body);
    if (!userId) return NextResponse.json({ error: "Choose a customer." }, { status: 400 });
    if (normalized.error) return NextResponse.json({ error: normalized.error }, { status: 400 });
    const vehicle = { id: randomUUID(), user_id: userId, ...normalized.value };
    if (!hasDatabase()) return NextResponse.json({ vehicle, preview: true }, { status: 201 });

    const customer = await query("SELECT id, name, email FROM users WHERE id = $1 AND role = 'user'", [userId]);
    if (!customer.rows[0]) return NextResponse.json({ error: "Customer was not found." }, { status: 404 });
    const value = normalized.value;
    const result = await query(
      `INSERT INTO vehicles (
         id, user_id, year, make, model, nickname, color, vehicle_type,
         license_plate, plate_state, vin_last_six, service_notes
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [vehicle.id, userId, value.year, value.make, value.model, value.nickname, value.color, value.vehicle_type, value.license_plate, value.plate_state, value.vin_last_six, value.service_notes]
    );
    return NextResponse.json({ vehicle: { ...result.rows[0], customer_name: customer.rows[0].name, customer_email: customer.rows[0].email, covered: false } }, { status: 201 });
  } catch (error) {
    console.error("Admin vehicle creation failed", error);
    return NextResponse.json({ error: "Vehicle could not be added." }, { status: 500 });
  }
}
