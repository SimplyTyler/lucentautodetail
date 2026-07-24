import { AdminNav } from "../../components/admin-nav";
import { getAdminContext } from "../../lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }) {
  const { user } = await getAdminContext();
  return (
    <main className="portalLayout adminConsoleLayout">
      <AdminNav user={user} />
      <div className="portalMain adminMain">{children}</div>
    </main>
  );
}
