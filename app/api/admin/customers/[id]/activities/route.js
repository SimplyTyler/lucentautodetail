import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "../../../../../../lib/admin";
import { normalizeActivityInput } from "../../../../../../lib/crm";
import { hasDatabase, query } from "../../../../../../lib/db";

export async function POST(request, { params }) {
  const admin = await authorizeAdminRequest();
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  try {
    const { id: userId } = await params;
    const normalized = normalizeActivityInput(await request.json());
    if (normalized.error) return NextResponse.json({ error: normalized.error }, { status: 400 });
    const activity = {
      id: randomUUID(),
      user_id: userId,
      ...normalized.value,
      completed_at: null,
      created_by: admin.id,
      created_at: new Date().toISOString()
    };
    if (!hasDatabase()) return NextResponse.json({ activity, preview: true }, { status: 201 });

    const value = normalized.value;
    const result = await query(
      `INSERT INTO crm_activities (
         id, user_id, activity_type, subject, details, due_at, created_by
       )
       SELECT $1, u.id, $3, $4, $5, $6, $7
       FROM users u
       WHERE u.id = $2 AND u.role = 'user'
       RETURNING *`,
      [activity.id, userId, value.activity_type, value.subject, value.details, value.due_at, admin.id]
    );
    if (!result.rows[0]) return NextResponse.json({ error: "Customer was not found." }, { status: 404 });
    return NextResponse.json({ activity: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error("CRM activity creation failed", error);
    return NextResponse.json({ error: "Activity could not be added." }, { status: 500 });
  }
}
