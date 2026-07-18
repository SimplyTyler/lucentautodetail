import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSession } from "../../../lib/auth";
import { hasDatabase, query } from "../../../lib/db";

export async function POST(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  try {
    const body = await request.json();
    const vehicleId = String(body.vehicleId || "");
    const preferredDate = String(body.preferredDate || "");
    const notes = String(body.notes || "").trim().slice(0, 1000) || null;
    if (!vehicleId || !/^\d{4}-\d{2}-\d{2}$/.test(preferredDate)) {
      return NextResponse.json({ error: "Choose a vehicle and preferred date." }, { status: 400 });
    }

    const requestId = randomUUID();
    if (hasDatabase()) {
      const vehicle = await query("SELECT id FROM vehicles WHERE id = $1 AND user_id = $2", [vehicleId, session.id]);
      if (!vehicle.rows[0]) return NextResponse.json({ error: "Vehicle was not found." }, { status: 404 });
      await query(
        `INSERT INTO service_requests (id, user_id, vehicle_id, preferred_date, notes)
         VALUES ($1, $2, $3, $4, $5)`,
        [requestId, session.id, vehicleId, preferredDate, notes]
      );
    }
    return NextResponse.json({ ok: true, id: requestId }, { status: 201 });
  } catch (error) {
    console.error("Service request failed", error);
    return NextResponse.json({ error: "Visit request could not be saved." }, { status: 500 });
  }
}
