import { redirect } from "next/navigation";
import { getCurrentUser, getSession, isAdminSession } from "./auth";
import { hasDatabase } from "./db";

const previewAdmin = {
  id: "admin-preview",
  name: "Lucent Operations",
  email: "owner@lucentautodetail.com",
  role: "admin",
  preview: true
};

export async function getAdminContext(nextPath = "/admin") {
  if (!hasDatabase()) return { user: previewAdmin, preview: true };

  const session = await getSession();
  if (!isAdminSession(session)) redirect(`/account?next=${encodeURIComponent(nextPath)}`);
  const user = await getCurrentUser(session);
  if (!user) redirect("/account");
  return { user, preview: false };
}

export async function authorizeAdminRequest() {
  if (!hasDatabase()) return previewAdmin;
  const session = await getSession();
  if (!isAdminSession(session)) return null;
  return getCurrentUser(session);
}
