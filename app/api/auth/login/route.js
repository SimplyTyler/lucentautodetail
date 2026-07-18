import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createSessionToken, isAdminEmail, SESSION_COOKIE, sessionCookieOptions } from "../../../../lib/auth";
import { hasDatabase, query } from "../../../../lib/db";

export async function POST(request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!email || !password) return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });

    let user;
    if (hasDatabase()) {
      const result = await query("SELECT id, name, email, role, password_hash FROM users WHERE email = $1 LIMIT 1", [email]);
      user = result.rows[0];
      if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
      }
    } else {
      user = { id: randomUUID(), name: email.split("@")[0].replace(/[._-]/g, " ") || "Preview Member", email, role: isAdminEmail(email) ? "admin" : "user" };
    }

    const token = await createSessionToken(user);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    console.error("Login failed", error);
    return NextResponse.json({ error: "Sign in is temporarily unavailable." }, { status: 500 });
  }
}
