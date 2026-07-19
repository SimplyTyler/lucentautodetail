import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "../../../../lib/admin";
import { hasDatabase, query } from "../../../../lib/db";
import { normalizeVisitInput } from "../../../../lib/visits";

const appointmentStatuses = new Set(["requested", "confirmed", "in_progress", "completed", "cancelled"]);

function adminFields(body) {
  return {
    admin_notes: String(body.adminNotes || "").trim().slice(0, 2000) || null,
    assigned_detailer: String(body.assignedDetailer || "").trim().slice(0, 100) || null
  };
}

async function appointmentById(id) {
  const result = await query(
    `SELECT sr.*, u.name AS customer_name, u.email AS customer_email, v.make, v.model, v.nickname
     FROM service_requests sr
     JOIN users u ON u.id = sr.user_id
     LEFT JOIN vehicles v ON v.id = sr.vehicle_id
     WHERE sr.id = $1`,
    [id]
  );
  return result.rows[0];
}

export async function POST(request) {
  const admin = await authorizeAdminRequest();
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  try {
    const body = await request.json();
    const userId = String(body.userId || "").trim();
    const normalized = normalizeVisitInput(body);
    if (!userId) return NextResponse.json({ error: "Choose a customer." }, { status: 400 });
    if (normalized.error) return NextResponse.json({ error: normalized.error }, { status: 400 });
    const extra = adminFields(body);
    const status = appointmentStatuses.has(body.status) ? body.status : "confirmed";
    const appointment = { id: randomUUID(), user_id: userId, status, ...normalized.value, ...extra };
    if (!hasDatabase()) return NextResponse.json({ appointment, preview: true }, { status: 201 });

    const vehicle = await query(
      `SELECT v.id FROM vehicles v JOIN users u ON u.id = v.user_id
       WHERE v.id = $1 AND v.user_id = $2 AND u.role = 'user'`,
      [normalized.value.vehicle_id, userId]
    );
    if (!vehicle.rows[0]) return NextResponse.json({ error: "That vehicle does not belong to the selected customer." }, { status: 400 });
    const value = normalized.value;
    await query(
      `INSERT INTO service_requests (
         id, user_id, vehicle_id, preferred_date, preferred_window, service_type,
         service_location, service_address, notes, admin_notes, assigned_detailer, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [appointment.id, userId, value.vehicle_id, value.preferred_date, value.preferred_window, value.service_type, value.service_location, value.service_address, value.notes, extra.admin_notes, extra.assigned_detailer, status]
    );
    return NextResponse.json({ appointment: await appointmentById(appointment.id) }, { status: 201 });
  } catch (error) {
    console.error("Admin appointment creation failed", error);
    return NextResponse.json({ error: "Appointment could not be created." }, { status: 500 });
  }
}
