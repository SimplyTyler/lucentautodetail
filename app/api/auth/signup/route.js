import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createSessionToken, isAdminEmail, SESSION_COOKIE, sessionCookieOptions } from "../../../../lib/auth";
import { hasDatabase, query } from "../../../../lib/db";

export async function POST(request) {
  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8 || body.terms !== "on") {
      return NextResponse.json({ error: "Enter a valid name, email, and password of at least 8 characters." }, { status: 400 });
    }

    const user = { id: randomUUID(), name, email, role: isAdminEmail(email) ? "admin" : "user" };
    if (hasDatabase()) {
      const passwordHash = await bcrypt.hash(password, 12);
      await query("INSERT INTO users (id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)", [user.id, name, email, passwordHash, user.role]);
    }

    const token = await createSessionToken(user);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    if (error?.code === "23505") return NextResponse.json({ error: "An account already exists for that email." }, { status: 409 });
    console.error("Signup failed", error);
    return NextResponse.json({ error: "Account creation is temporarily unavailable." }, { status: 500 });
  }
}
