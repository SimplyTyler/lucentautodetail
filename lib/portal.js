import { redirect } from "next/navigation";
import { getCurrentUser, getSession, isAdminSession } from "./auth";
import { hasDatabase } from "./db";

export async function getPortalContext(nextPath = "/portal") {
  const session = await getSession();
  if (!session && hasDatabase()) redirect(`/account?next=${encodeURIComponent(nextPath)}`);

  const user = session
    ? await getCurrentUser(session)
    : { id: "preview", name: "Alex Morgan", email: "alex@example.com", role: "user", preview: true };
  if (!user && hasDatabase()) redirect("/account");

  return {
    session,
    user,
    admin: isAdminSession(session),
    preview: !hasDatabase() || Boolean(user?.preview)
  };
}
