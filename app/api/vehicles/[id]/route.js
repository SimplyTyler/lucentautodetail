import { NextResponse } from "next/server";
import { getSession } from "../../../../lib/auth";
import { hasDatabase, query } from "../../../../lib/db";

export async function DELETE(_request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { id } = await params;
  if (hasDatabase()) await query("DELETE FROM vehicles WHERE id = $1 AND user_id = $2", [id, session.id]);
  return NextResponse.json({ ok: true });
}
