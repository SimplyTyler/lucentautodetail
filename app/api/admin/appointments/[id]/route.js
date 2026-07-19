import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "../../../../../lib/admin";
import { hasDatabase, query } from "../../../../../lib/db";
import { currentBusinessDate, normalizeVisitInput } from "../../../../../lib/visits";

const appointmentStatuses = new Set(["requested", "confirmed", "in_progress", "completed", "cancelled"]);

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

export async function PATCH(request, { params }) {
  const admin = await authorizeAdminRequest();
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  try {
    const { id } = await params;
    const body = await request.json();
    if (!hasDatabase()) {
      if (body.action === "cancel") return NextResponse.json({ appointment: { id, status: "cancelled" }, preview: true });
      if (body.action === "status") {
        const status = appointmentStatuses.has(body.status) ? body.status : "confirmed";
        return NextResponse.json({ appointment: { id, status }, preview: true });
      }
      const normalized = normalizeVisitInput(body, { allowPast: true });
      if (normalized.error) return NextResponse.json({ error: normalized.error }, { status: 400 });
      return NextResponse.json({ appointment: { id, status: appointmentStatuses.has(body.status) ? body.status : "confirmed", ...normalized.value, admin_notes: String(body.adminNotes || "").trim() || null, assigned_detailer: String(body.assignedDetailer || "").trim() || null }, preview: true });
    }

    const existing = await query("SELECT * FROM service_requests WHERE id = $1", [id]);
    const appointment = existing.rows[0];
    if (!appointment) return NextResponse.json({ error: "Appointment was not found." }, { status: 404 });

    if (body.action === "cancel") {
      await query("UPDATE service_requests SET status = 'cancelled', updated_at = NOW() WHERE id = $1", [id]);
      return NextResponse.json({ appointment: await appointmentById(id) });
    }
    if (body.action === "status") {
      if (!appointmentStatuses.has(body.status)) return NextResponse.json({ error: "Choose a valid appointment status." }, { status: 400 });
      await query("UPDATE service_requests SET status = $1, updated_at = NOW() WHERE id = $2", [body.status, id]);
      return NextResponse.json({ appointment: await appointmentById(id) });
    }

    const normalized = normalizeVisitInput(body, { allowPast: true });
    if (normalized.error) return NextResponse.json({ error: normalized.error }, { status: 400 });
    const value = normalized.value;
    const existingDate = String(appointment.preferred_date || "").slice(0, 10);
    if (value.preferred_date < currentBusinessDate() && value.preferred_date !== existingDate) {
      return NextResponse.json({ error: "Rescheduled appointments must use today or a future date." }, { status: 400 });
    }
    const vehicle = await query("SELECT id FROM vehicles WHERE id = $1 AND user_id = $2", [value.vehicle_id, appointment.user_id]);
    if (!vehicle.rows[0]) return NextResponse.json({ error: "That vehicle does not belong to this customer." }, { status: 400 });
    const status = appointmentStatuses.has(body.status) ? body.status : appointment.status;
    const adminNotes = String(body.adminNotes || "").trim().slice(0, 2000) || null;
    const assignedDetailer = String(body.assignedDetailer || "").trim().slice(0, 100) || null;
    await query(
      `UPDATE service_requests SET
         vehicle_id = $1, preferred_date = $2, preferred_window = $3, service_type = $4,
         service_location = $5, service_address = $6, notes = $7, admin_notes = $8,
         assigned_detailer = $9, status = $10, updated_at = NOW()
       WHERE id = $11`,
      [value.vehicle_id, value.preferred_date, value.preferred_window, value.service_type, value.service_location, value.service_address, value.notes, adminNotes, assignedDetailer, status, id]
    );
    return NextResponse.json({ appointment: await appointmentById(id) });
  } catch (error) {
    console.error("Admin appointment update failed", error);
    return NextResponse.json({ error: "Appointment could not be updated." }, { status: 500 });
  }
}
