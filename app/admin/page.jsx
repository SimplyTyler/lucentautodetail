import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarClock, CarFront, CircleDollarSign, Clock3, Plus, ReceiptText, ShieldAlert, UsersRound, Wrench } from "lucide-react";
import { getAdminWorkspaceData } from "../../lib/admin-data";
import { getAdminInvoiceData } from "../../lib/invoices";
import { formatMoney, getPlan, membershipPlans } from "../../lib/plans";
import { currentBusinessDate, visitServices, visitWindows } from "../../lib/visits";

export const metadata = { title: "Operations Admin" };

function dateLabel(value, options = {}) {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC", ...options }).format(new Date(value));
}

function vehicleLabel(appointment) {
  return appointment.nickname || [appointment.make, appointment.model].filter(Boolean).join(" ") || "Vehicle pending";
}

function invoiceMoney(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format((value || 0) / 100);
}

export default async function AdminPage() {
  const data = await getAdminWorkspaceData();
  const invoiceData = await getAdminInvoiceData(data.customers);
  const today = currentBusinessDate();
  const todayDisplay = new Date(`${today}T12:00:00.000Z`);
  const businessHour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: "America/Phoenix" }).format(new Date()));
  const greeting = businessHour < 12 ? "morning" : businessHour < 17 ? "afternoon" : "evening";
  const activeAppointments = data.appointments
    .filter((appointment) => ["requested", "confirmed", "in_progress"].includes(appointment.status))
    .sort((a, b) => String(a.preferred_date).localeCompare(String(b.preferred_date)));
  const todayAppointments = activeAppointments.filter((appointment) => String(appointment.preferred_date).slice(0, 10) === today);
  const schedule = todayAppointments.length ? todayAppointments : activeAppointments.slice(0, 4);
  const requested = data.appointments.filter((appointment) => appointment.status === "requested");
  const pastDue = data.memberships.filter((membership) => membership.status === "past_due");
  const dueFollowUps = data.activities.filter((activity) => activity.activity_type === "follow_up" && !activity.completed_at && new Date(activity.due_at).getTime() <= Date.now());
  const recentCustomers = [...data.customers].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);

  return (
    <>
      {data.preview && <div className="portalNotice">Admin preview is active. Every operation can be exercised safely before PostgreSQL and Stripe are connected.</div>}
      <header className="portalHeader adminCommandHeader">
        <div><span className="kicker">Operations</span><h1>Good {greeting}.</h1><p>{dateLabel(todayDisplay, { weekday: "long" })}. Here is what needs attention across Lucent.</p></div>
        <div className="adminHeaderActions">
          <Link className="button buttonOutline" href="/admin/invoices?new=1"><ReceiptText size={17} /> New invoice</Link>
          <Link className="button buttonLime" href="/admin/appointments?new=1"><Plus size={17} /> New appointment</Link>
        </div>
      </header>

      <section className="adminCommandMetrics" aria-label="Operations summary">
        <div><span><UsersRound size={17} /> Customers</span><strong>{data.metrics.customers}</strong><small>{data.metrics.members} active memberships</small></div>
        <div><span><CalendarClock size={17} /> Today</span><strong>{data.metrics.todayAppointments}</strong><small>{data.metrics.openAppointments} open appointments</small></div>
        <div><span><CarFront size={17} /> Vehicles</span><strong>{data.metrics.vehicles}</strong><small>Across the customer registry</small></div>
        <div><span><CircleDollarSign size={17} /> Receivables</span><strong>{invoiceMoney(invoiceData.metrics.outstanding)}</strong><small>{invoiceData.metrics.overdue} overdue / {formatMoney(data.metrics.monthlyRevenue)} plan value</small></div>
      </section>

      <section className="adminDashboardGrid">
        <div className="adminSurface adminScheduleBoard">
          <div className="adminSurfaceHeading"><div><span className="kicker">{todayAppointments.length ? "Today's run" : "Next up"}</span><h2>{todayAppointments.length ? `${todayAppointments.length} appointment${todayAppointments.length === 1 ? "" : "s"}` : "Upcoming schedule"}</h2></div><Link className="panelLink" href="/admin/appointments">Open schedule <ArrowRight size={16} /></Link></div>
          <div className="adminScheduleList">
            {schedule.map((appointment) => {
              const service = visitServices.find((item) => item.code === appointment.service_type);
              const window = visitWindows.find((item) => item.code === appointment.preferred_window);
              return (
                <div className="adminScheduleRow" key={appointment.id}>
                  <span className="adminScheduleTime"><strong>{window?.name || "Flexible"}</strong><small>{window?.detail || dateLabel(appointment.preferred_date)}</small></span>
                  <span className="adminScheduleMarker" />
                  <div><strong>{appointment.customer_name}</strong><small>{vehicleLabel(appointment)} - {service?.name || "Detail service"}</small></div>
                  <span className="adminDetailer"><Wrench size={14} /> {appointment.assigned_detailer || "Unassigned"}</span>
                  <span className={`statusPill status${appointment.status}`}>{appointment.status.replace("_", " ")}</span>
                </div>
              );
            })}
            {!schedule.length && <div className="emptyState adminCompactEmpty"><CalendarClock size={25} /><strong>The schedule is clear</strong><p>Create an appointment when the next customer is ready.</p></div>}
          </div>
        </div>

        <aside className="adminSurface adminAttentionPanel">
          <div className="adminSurfaceHeading"><div><span className="kicker">Action queue</span><h2>Needs attention</h2></div><ShieldAlert size={20} /></div>
          <Link className="adminAttentionRow" href="/admin/invoices?status=overdue"><span className="attentionIcon attentionIconOrange"><ReceiptText size={18} /></span><div><strong>{invoiceData.metrics.overdue} overdue invoices</strong><small>{invoiceMoney(invoiceData.metrics.outstanding)} currently outstanding</small></div><ArrowRight size={16} /></Link>
          <Link className="adminAttentionRow" href="/admin/customers?status=followups"><span className="attentionIcon"><Clock3 size={18} /></span><div><strong>{dueFollowUps.length} customer follow-ups due</strong><small>Calls, messages, and next steps ready today</small></div><ArrowRight size={16} /></Link>
          <Link className="adminAttentionRow" href="/admin/appointments?status=requested"><span className="attentionIcon attentionIconIce"><Clock3 size={18} /></span><div><strong>{requested.length} unconfirmed requests</strong><small>Review and assign arrival windows</small></div><ArrowRight size={16} /></Link>
          <Link className="adminAttentionRow" href="/admin/memberships?status=past_due"><span className="attentionIcon attentionIconOrange"><AlertTriangle size={18} /></span><div><strong>{pastDue.length} billing exceptions</strong><small>Past-due memberships need follow-up</small></div><ArrowRight size={16} /></Link>
        </aside>
      </section>

      <section className="adminDashboardLower">
        <div className="adminSurface adminPlanMix">
          <div className="adminSurfaceHeading"><div><span className="kicker">Portfolio</span><h2>Membership mix</h2></div><Link className="panelLink" href="/admin/memberships">Manage plans <ArrowRight size={16} /></Link></div>
          <div className="adminPlanMixGrid">
            {membershipPlans.map((plan) => {
              const memberships = data.memberships.filter((membership) => membership.plan_code === plan.code);
              const slots = memberships.reduce((sum, membership) => sum + membership.vehicle_count, 0);
              return <div key={plan.code}><span className={`adminPlanSwatch adminPlanSwatch${plan.accent}`} /><small>{plan.name}</small><strong>{memberships.length}</strong><p>{slots} care slots - {formatMoney(slots * plan.price)} monthly</p></div>;
            })}
          </div>
        </div>

        <div className="adminSurface adminRecentCustomers">
          <div className="adminSurfaceHeading"><div><span className="kicker">Accounts</span><h2>Recent customers</h2></div><Link className="panelLink" href="/admin/customers">View all <ArrowRight size={16} /></Link></div>
          {recentCustomers.map((customer) => <Link className="adminCustomerMiniRow" href={`/admin/customers?customer=${customer.id}`} key={customer.id}><span>{customer.name.slice(0, 1)}</span><div><strong>{customer.name}</strong><small>{customer.email}</small></div><div><strong>{getPlan(customer.plan_code)?.name || "Lead"}</strong><small>{customer.vehicle_total} vehicle{customer.vehicle_total === 1 ? "" : "s"}</small></div><ArrowRight size={15} /></Link>)}
        </div>
      </section>
    </>
  );
}
