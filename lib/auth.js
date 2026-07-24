import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { hasDatabase, query } from "./db";

export const SESSION_COOKIE = "lucent_session";
const SESSION_AGE = 60 * 60 * 24 * 7;

function sessionSecret() {
  const value = process.env.SESSION_SECRET;
  if (value) {
    return new TextEncoder().encode(value);
  }
  if (!hasDatabase()) {
    return new TextEncoder().encode("lucent-local-preview-session-secret");
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is required in production.");
  }
  return new TextEncoder().encode("lucent-local-preview-session-secret");
}

export function isAdminEmail(email = "") {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}

export async function createSessionToken(user) {
  return new SignJWT({
    email: user.email,
    name: user.name,
    role: user.role || (isAdminEmail(user.email) ? "admin" : "user")
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_AGE}s`)
    .sign(sessionSecret());
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_AGE,
    path: "/"
  };
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, sessionSecret());
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role
    };
  } catch {
    return null;
  }
}

export function isAdminSession(session) {
  return Boolean(session && (session.role === "admin" || isAdminEmail(session.email)));
}

export async function getCurrentUser(session) {
  if (!session) {
    return null;
  }
  if (!hasDatabase()) {
    return { ...session, stripe_customer_id: null, preview: true };
  }

  const result = await query(
    "SELECT id, name, email, role, stripe_customer_id, created_at FROM users WHERE id = $1 LIMIT 1",
    [session.id]
  );
  return result.rows[0] || null;
}
