import { redirect } from "next/navigation";
import { CalendarClock, CarFront, CircleDollarSign, UsersRound } from "lucide-react";
import { AdminMemberTable } from "../../components/admin-member-table";
import { PortalNav } from "../../components/portal-nav";
import { getCurrentUser, getSession, isAdminSession } from "../../lib/auth";
import { getAdminData } from "../../lib/data";
import { hasDatabase } from "../../lib/db";
import { formatMoney } from "../../lib/plans";

export const metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSession();
  if (hasDatabase() && !isAdminSession(session)) redirect("/account?next=/admin");
  const user = session ? await getCurrentUser(session) : { id: "admin-preview", name: "Lucent Admin", email: "owner@lucentautodetail.com", role: "admin", preview: true };
  const data = await getAdminData();

  return (
    <main className="portalLayout adminLayout">
      <PortalNav user={user} admin />
      <div className="portalMain">
        {data.preview && <div className="portalNotice">Admin preview data is shown until PostgreSQL is connected and ADMIN_EMAILS is configured.</div>}
        <header className="portalHeader adminHeader">
          <div><span className="kicker">Operations</span><h1>Membership overview</h1><p>Monitor members, vehicle volume, service demand, and subscription health.</p></div>
        </header>

        <section className="adminMetrics">
          <div><UsersRound size={19} /><span>Active members</span><strong>{data.metrics.members}</strong><small>Active or trialing</small></div>
          <div><CarFront size={19} /><span>Vehicles covered</span><strong>{data.metrics.vehicles}</strong><small>Across all plans</small></div>
          <div><CircleDollarSign size={19} /><span>Monthly run rate</span><strong>{formatMoney(data.metrics.monthlyRevenue)}</strong><small>Plan value estimate</small></div>
          <div><CalendarClock size={19} /><span>Open requests</span><strong>{data.metrics.openRequests}</strong><small>Requested or confirmed</small></div>
        </section>

        <section className="adminGrid">
          <AdminMemberTable members={data.members} />

          <aside className="requestQueue">
            <div className="panelHeading"><div><span className="kicker">Queue</span><h2>Service requests</h2></div></div>
            {data.requests.map((request) => <div className="queueRow" key={request.id}><span className="queueDate"><strong>{request.preferred_date ? new Date(request.preferred_date).getUTCDate() : "—"}</strong><small>{request.preferred_date ? new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(new Date(request.preferred_date)) : "TBD"}</small></span><div><strong>{request.name}</strong><small>{request.make ? `${request.make} ${request.model}` : "Vehicle pending"}</small></div><span className={`statusPill status${request.status}`}>{request.status}</span></div>)}
            {!data.requests.length && <p className="emptyQueue">No open service requests.</p>}
          </aside>
        </section>
      </div>
    </main>
  );
}
