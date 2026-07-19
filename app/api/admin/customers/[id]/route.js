import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "../../../../../lib/admin";
import { hasDatabase, query } from "../../../../../lib/db";

export async function PATCH(request, { params }) {
  const admin = await authorizeAdminRequest();
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  try {
    const { id } = await params;
    const body = await request.json();
    const phone = String(body.phone || "").trim().slice(0, 40) || null;
    const adminNotes = String(body.adminNotes || "").trim().slice(0, 2000) || null;
    if (!hasDatabase()) return NextResponse.json({ customer: { id, phone, admin_notes: adminNotes }, preview: true });

    const result = await query(
      `UPDATE users SET phone = $1, admin_notes = $2, updated_at = NOW()
       WHERE id = $3 AND role = 'user'
       RETURNING id, name, email, phone, admin_notes, created_at`,
      [phone, adminNotes, id]
    );
    if (!result.rows[0]) return NextResponse.json({ error: "Customer was not found." }, { status: 404 });
    return NextResponse.json({ customer: result.rows[0] });
  } catch (error) {
    console.error("Admin customer update failed", error);
    return NextResponse.json({ error: "Customer notes could not be saved." }, { status: 500 });
  }
}
