import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSession } from "../../../lib/auth";
import { hasDatabase, query } from "../../../lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ vehicles: [] });
  const result = await query("SELECT * FROM vehicles WHERE user_id = $1 ORDER BY created_at ASC", [session.id]);
  return NextResponse.json({ vehicles: result.rows });
}

export async function POST(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  try {
    const body = await request.json();
    const year = Number(body.year);
    const make = String(body.make || "").trim();
    const model = String(body.model || "").trim();
    const nickname = String(body.nickname || "").trim() || null;
    const color = String(body.color || "").trim() || null;
    const vehicleType = ["daily", "collector", "business"].includes(body.vehicleType) ? body.vehicleType : "daily";
    if (!Number.isInteger(year) || year < 1900 || year > 2100 || !make || !model) {
      return NextResponse.json({ error: "Enter a valid year, make, and model." }, { status: 400 });
    }

    const vehicle = { id: randomUUID(), user_id: session.id, year, make, model, nickname, color, vehicle_type: vehicleType };
    if (hasDatabase()) {
      const result = await query(
        `INSERT INTO vehicles (id, user_id, year, make, model, nickname, color, vehicle_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [vehicle.id, session.id, year, make, model, nickname, color, vehicleType]
      );
      return NextResponse.json({ vehicle: result.rows[0] }, { status: 201 });
    }
    return NextResponse.json({ vehicle }, { status: 201 });
  } catch (error) {
    console.error("Vehicle creation failed", error);
    return NextResponse.json({ error: "Vehicle could not be added." }, { status: 500 });
  }
}
