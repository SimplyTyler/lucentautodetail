import Link from "next/link";
import { ArrowRight, CalendarDays, CarFront, Clock3, CreditCard, Gauge, MapPin, ShieldCheck } from "lucide-react";
import { getPortalData } from "../../lib/data";
import { formatMoney, getPlan } from "../../lib/plans";
import { getPortalContext } from "../../lib/portal";
import { visitServices, visitWindows } from "../../lib/visits";

export const metadata = { title: "Member Portal" };

function dateLabel(value, options = {}) {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC", ...options }).format(new Date(value));
}

function vehicleLabel(request) {
  return request.nickname || [request.make, request.model].filter(Boolean).join(" ") || "Member vehicle";
}

export default async function PortalPage() {
  const { user } = await getPortalContext("/portal");
  const data = await getPortalData(user);
  const membership = data.membership;
  const plan = membership ? getPlan(membership.plan_code) : null;
  const upcoming = data.requests
    .filter((request) => !["completed", "cancelled"].includes(request.status))
    .sort((a, b) => new Date(a.preferred_date) - new Date(b.preferred_date));
  const nextVisit = upcoming[0];
  const service = nextVisit ? visitServices.find((item) => item.code === nextVisit.service_type) : null;
  const window = nextVisit ? visitWindows.find((item) => item.code === nextVisit.preferred_window) : null;
  const monthly = plan && membership ? plan.price * membership.vehicle_count : 0;

  return (
    <>
      {data.preview && <div className="portalNotice">Preview data is active. Changes stay in this browser until PostgreSQL and Stripe are connected.</div>}

      <header className="portalHeader portalOverviewHeader">
        <div>
          <span className="kicker">Overview</span>
          <h1>Good {new Date().getHours() < 12 ? "morning" : "afternoon"}, {user.name.split(" ")[0]}.</h1>
          <p>Your garage, care schedule, and membership are organized here.</p>
        </div>
        <Link className="button buttonLime" href="/portal/visits"><CalendarDays size={17} /> Plan a visit</Link>
      </header>

      <section className="portalMetrics portalMetricsFour" aria-label="Account summary">
        <div><span><CarFront size={18} /> Garage</span><strong>{String(data.vehicles.length).padStart(2, "0")}</strong><small>{data.coveredVehicleIds.length} assigned to care</small></div>
        <div><span><CalendarDays size={18} /> Next visit</span><strong>{nextVisit ? dateLabel(nextVisit.preferred_date, { year: undefined }) : "None"}</strong><small>{nextVisit?.status || "Plan when ready"}</small></div>
        <div><span><ShieldCheck size={18} /> Membership</span><strong>{plan?.name || "None"}</strong><small>{membership?.cancel_at_period_end ? "Ends this period" : membership?.status || "Choose a plan"}</small></div>
        <div><span><CreditCard size={18} /> Monthly</span><strong>{monthly ? formatMoney(monthly) : "$0"}</strong><small>{membership ? `${membership.vehicle_count} vehicle${membership.vehicle_count === 1 ? "" : "s"}` : "No recurring billing"}</small></div>
      </section>

      <section className="portalDashboardGrid">
        <div className="portalPanel nextVisitPanel">
          <div className="panelHeading"><div><span className="kicker">Next up</span><h2>{nextVisit ? dateLabel(nextVisit.preferred_date) : "No visit planned"}</h2></div><Clock3 size={20} /></div>
          {nextVisit ? (
            <div className="nextVisitDetails">
              <div className="nextVisitDate"><strong>{new Date(nextVisit.preferred_date).getUTCDate()}</strong><span>{dateLabel(nextVisit.preferred_date, { day: undefined, year: undefined })}</span></div>
              <div className="nextVisitMeta">
                <strong>{vehicleLabel(nextVisit)}</strong>
                <span><Gauge size={15} /> {service?.name || "Membership detail"}</span>
                <span><Clock3 size={15} /> {window ? `${window.name}, ${window.detail}` : "Window pending"}</span>
                <span><MapPin size={15} /> {nextVisit.service_location === "studio" ? "Lucent studio" : nextVisit.service_address || "Address pending"}</span>
              </div>
              <span className={`statusPill status${nextVisit.status}`}>{nextVisit.status}</span>
            </div>
          ) : (
            <div className="emptyState compactEmpty"><CalendarDays size={24} /><strong>Your calendar is clear</strong><p>Choose a vehicle and preferred service window when you are ready.</p></div>
          )}
          <Link className="panelLink" href="/portal/visits">View schedule <ArrowRight size={16} /></Link>
        </div>

        <div className="portalPanel membershipSnapshot">
          <div className="panelHeading"><div><span className="kicker">Current care</span><h2>{plan ? `${plan.name} membership` : "No active membership"}</h2></div>{membership && <span className={`statusPill status${membership.status}`}>{membership.status}</span>}</div>
          {plan ? (
            <>
              <p>{plan.description}</p>
              <div className="membershipNumbers"><span><small>Care slots</small><strong>{membership.vehicle_count}</strong></span><span><small>Next renewal</small><strong>{dateLabel(membership.current_period_end, { year: undefined })}</strong></span></div>
              {membership.cancel_at_period_end && <div className="attentionLine">Cancellation is scheduled for the end of this billing period.</div>}
            </>
          ) : <p>Choose recurring care and assign the vehicles you want Lucent to maintain.</p>}
          <Link className="panelLink" href="/portal/membership">Manage membership <ArrowRight size={16} /></Link>
        </div>
      </section>

      <section className="portalPanel garageSnapshot">
        <div className="panelHeading"><div><span className="kicker">Garage</span><h2>Vehicles in your account</h2></div><Link className="button buttonOutline" href="/portal/vehicles">Manage vehicles <ArrowRight size={16} /></Link></div>
        <div className="garageSnapshotGrid">
          {data.vehicles.slice(0, 3).map((vehicle) => (
            <div className="garageSnapshotItem" key={vehicle.id}>
              <span><CarFront size={20} /></span>
              <div><strong>{vehicle.nickname || `${vehicle.year} ${vehicle.make}`}</strong><small>{vehicle.year} {vehicle.make} {vehicle.model}</small></div>
              <i className={data.coveredVehicleIds.includes(vehicle.id) ? "coverageDot coverageDotActive" : "coverageDot"} title={data.coveredVehicleIds.includes(vehicle.id) ? "Assigned to membership" : "Not assigned"} />
            </div>
          ))}
          {!data.vehicles.length && <div className="emptyState compactEmpty"><CarFront size={24} /><strong>No vehicles yet</strong><p>Add the first vehicle you want Lucent to care for.</p></div>}
        </div>
      </section>
    </>
  );
}
