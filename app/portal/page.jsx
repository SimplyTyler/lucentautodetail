import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarDays, CarFront, CheckCircle2, Clock3, CreditCard } from "lucide-react";
import { BillingButton } from "../../components/billing-button";
import { PortalNav } from "../../components/portal-nav";
import { ServiceRequestForm } from "../../components/service-request-form";
import { VehicleManager } from "../../components/vehicle-manager";
import { getCurrentUser, getSession, isAdminSession } from "../../lib/auth";
import { getPortalData } from "../../lib/data";
import { hasDatabase } from "../../lib/db";
import { formatMoney, getPlan } from "../../lib/plans";

export const metadata = { title: "Member Portal" };
export const dynamic = "force-dynamic";

function dateLabel(value) {
  if (!value) return "To be confirmed";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}

export default async function PortalPage({ searchParams }) {
  const session = await getSession();
  if (!session && hasDatabase()) redirect("/account?next=/portal");

  const user = session ? await getCurrentUser(session) : { id: "preview", name: "Alex Morgan", email: "alex@example.com", role: "user", preview: true };
  if (!user && hasDatabase()) redirect("/account");

  const data = await getPortalData(user);
  const membership = data.membership;
  const plan = membership ? getPlan(membership.plan_code) : null;
  const params = await searchParams;

  return (
    <main className="portalLayout">
      <PortalNav user={user} admin={isAdminSession(session)} />
      <div className="portalMain">
        {data.preview && <div className="portalNotice">Preview data is shown until PostgreSQL is connected.</div>}
        {params?.checkout === "success" && <div className="successBanner"><CheckCircle2 size={18} /> Subscription received. Stripe is confirming the membership now.</div>}

        <header className="portalHeader">
          <div><span className="kicker">Member portal</span><h1>Good {new Date().getHours() < 12 ? "morning" : "afternoon"}, {user.name.split(" ")[0]}.</h1><p>Your vehicles, next visit, and membership at a glance.</p></div>
          <ServiceRequestForm vehicles={data.vehicles} />
        </header>

        <section className="portalMetrics" aria-label="Account summary">
          <div><span><CarFront size={18} /> Vehicles</span><strong>{String(data.vehicles.length).padStart(2, "0")}</strong><small>{membership ? `${membership.vehicle_count} on membership` : "No active plan"}</small></div>
          <div><span><CalendarDays size={18} /> Next visit</span><strong>{data.requests[0] ? dateLabel(data.requests[0].preferred_date).replace(/, \d{4}/, "") : "—"}</strong><small>{data.requests[0]?.status || "No visit requested"}</small></div>
          <div><span><CreditCard size={18} /> Membership</span><strong>{plan?.name || "None"}</strong><small>{membership?.status || "Choose a plan"}</small></div>
        </section>

        <section className="portalColumns">
          <div className="portalPanel" id="visits">
            <div className="panelHeading"><div><span className="kicker">Schedule</span><h2>Upcoming visits</h2></div><Clock3 size={20} /></div>
            <div className="visitList">
              {data.requests.map((request) => (
                <div className="visitRow" key={request.id}>
                  <span className="visitDate"><strong>{new Date(request.preferred_date).getUTCDate()}</strong><small>{new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(new Date(request.preferred_date))}</small></span>
                  <div><strong>{request.make ? `${request.make} ${request.model}` : "Membership detail"}</strong><small>Preferred service date</small></div>
                  <span className={`statusPill status${request.status}`}>{request.status}</span>
                </div>
              ))}
              {!data.requests.length && <div className="emptyState"><CalendarDays size={24} /><strong>No visits scheduled</strong><p>Request your next membership detail when the timing is right.</p></div>}
            </div>
          </div>

          <div className="portalPanel membershipPanel">
            <div className="panelHeading"><div><span className="kicker">Membership</span><h2>{plan ? `${plan.name} care` : "Choose your care"}</h2></div>{membership && <span className={`statusPill status${membership.status}`}>{membership.status}</span>}</div>
            {plan ? (
              <>
                <p>{plan.description}</p>
                <div className="membershipNumbers"><span><small>Vehicles</small><strong>{membership.vehicle_count}</strong></span><span><small>Monthly</small><strong>{formatMoney(plan.price * membership.vehicle_count)}</strong></span></div>
                <small className="renewalLine">Current period ends {dateLabel(membership.current_period_end)}</small>
                <BillingButton />
              </>
            ) : (
              <><p>Pick a per-vehicle plan to unlock recurring care and centralized billing.</p><Link className="button buttonDark" href="/membership">Explore memberships <ArrowRight size={17} /></Link></>
            )}
          </div>
        </section>

        <section className="portalPanel garagePanel" id="vehicles"><VehicleManager initialVehicles={data.vehicles} preview={data.preview} /></section>
      </div>
    </main>
  );
}
