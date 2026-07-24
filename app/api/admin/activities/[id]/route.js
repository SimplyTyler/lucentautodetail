import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "../../../../../lib/admin";
import { hasDatabase, query } from "../../../../../lib/db";

export async function PATCH(request, { params }) {
  const admin = await authorizeAdminRequest();
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const completed = body.action === "complete";
  if (!["complete", "reopen"].includes(body.action)) {
    return NextResponse.json({ error: "Choose a valid activity action." }, { status: 400 });
  }
  if (!hasDatabase()) {
    return NextResponse.json({ activity: { id, completed_at: completed ? new Date().toISOString() : null }, preview: true });
  }

  const result = await query(
    `UPDATE crm_activities SET completed_at = $1, updated_at = NOW()
     WHERE id = $2 RETURNING *`,
    [completed ? new Date() : null, id]
  );
  if (!result.rows[0]) return NextResponse.json({ error: "Activity was not found." }, { status: 404 });
  return NextResponse.json({ activity: result.rows[0] });
}

export async function DELETE(_request, { params }) {
  const admin = await authorizeAdminRequest();
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const { id } = await params;
  if (!hasDatabase()) return NextResponse.json({ ok: true, preview: true });
  const result = await query("DELETE FROM crm_activities WHERE id = $1 RETURNING id", [id]);
  if (!result.rows[0]) return NextResponse.json({ error: "Activity was not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
