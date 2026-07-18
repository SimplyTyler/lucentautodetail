import { PortalNav } from "../../components/portal-nav";
import { getPortalContext } from "../../lib/portal";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }) {
  const { user, admin } = await getPortalContext();

  return (
    <main className="portalLayout">
      <PortalNav user={user} admin={admin} />
      <div className="portalMain">{children}</div>
    </main>
  );
}
