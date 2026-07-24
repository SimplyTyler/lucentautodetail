import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSession } from "../../../lib/auth";
import { hasDatabase, query } from "../../../lib/db";
import { normalizeVehicleInput } from "../../../lib/vehicle";

export async function GET() {
  const session = await getSession();
  if (!session && hasDatabase()) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ vehicles: [] });
  const result = await query("SELECT * FROM vehicles WHERE user_id = $1 ORDER BY created_at ASC", [session.id]);
  return NextResponse.json({ vehicles: result.rows });
}

export async function POST(request) {
  const session = await getSession();
  if (!session && hasDatabase()) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  try {
    const body = await request.json();
    const normalized = normalizeVehicleInput(body);
    if (normalized.error) return NextResponse.json({ error: normalized.error }, { status: 400 });
    const value = normalized.value;

    const vehicle = { id: randomUUID(), user_id: session?.id || "preview", ...value };
    if (hasDatabase()) {
      const result = await query(
        `INSERT INTO vehicles (
           id, user_id, year, make, model, nickname, color, vehicle_type,
           license_plate, plate_state, vin_last_six, service_notes
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
        [vehicle.id, session.id, value.year, value.make, value.model, value.nickname, value.color, value.vehicle_type, value.license_plate, value.plate_state, value.vin_last_six, value.service_notes]
      );
      return NextResponse.json({ vehicle: result.rows[0] }, { status: 201 });
    }
    return NextResponse.json({ vehicle }, { status: 201 });
  } catch (error) {
    console.error("Vehicle creation failed", error);
    return NextResponse.json({ error: "Vehicle could not be added." }, { status: 500 });
  }
}
