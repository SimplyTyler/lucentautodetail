import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSession } from "../../../lib/auth";
import { hasDatabase, query } from "../../../lib/db";
import { normalizeVisitInput } from "../../../lib/visits";

export async function GET() {
  const session = await getSession();
  if (!session && hasDatabase()) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ requests: [] });
  const result = await query(
    `SELECT sr.*, v.make, v.model, v.nickname
     FROM service_requests sr
     LEFT JOIN vehicles v ON v.id = sr.vehicle_id
     WHERE sr.user_id = $1
     ORDER BY sr.preferred_date DESC NULLS LAST, sr.created_at DESC`,
    [session.id]
  );
  return NextResponse.json({ requests: result.rows });
}

export async function POST(request) {
  const session = await getSession();
  if (!session && hasDatabase()) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  try {
    const normalized = normalizeVisitInput(await request.json());
    if (normalized.error) return NextResponse.json({ error: normalized.error }, { status: 400 });
    const value = normalized.value;

    const requestId = randomUUID();
    let vehicleData = {};
    if (hasDatabase()) {
      const vehicle = await query("SELECT id, make, model, nickname FROM vehicles WHERE id = $1 AND user_id = $2", [value.vehicle_id, session.id]);
      if (!vehicle.rows[0]) return NextResponse.json({ error: "Vehicle was not found." }, { status: 404 });
      vehicleData = vehicle.rows[0];
      const inserted = await query(
        `INSERT INTO service_requests (
           id, user_id, vehicle_id, preferred_date, preferred_window, service_type,
           service_location, service_address, notes
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [requestId, session.id, value.vehicle_id, value.preferred_date, value.preferred_window, value.service_type, value.service_location, value.service_address, value.notes]
      );
      return NextResponse.json({ request: { ...inserted.rows[0], make: vehicleData.make, model: vehicleData.model, nickname: vehicleData.nickname } }, { status: 201 });
    }
    return NextResponse.json({ request: { id: requestId, user_id: "preview", status: "requested", ...value } }, { status: 201 });
  } catch (error) {
    console.error("Service request failed", error);
    return NextResponse.json({ error: "Visit request could not be saved." }, { status: 500 });
  }
}
