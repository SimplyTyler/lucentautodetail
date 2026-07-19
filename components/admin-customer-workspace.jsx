"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarClock, CarFront, CreditCard, Mail, MapPin, Phone, Save, Search, UserRound, Wrench } from "lucide-react";
import { getPlan } from "../lib/plans";

function dateLabel(value) {
  if (!value) return "No completed visits";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}

export function AdminCustomerWorkspace({ initialCustomers, vehicles, appointments, initialCustomerId, initialFilter, preview }) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [selectedId, setSelectedId] = useState(initialCustomerId || initialCustomers[0]?.id || null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState(["all", "members", "leads", "attention"].includes(initialFilter) ? initialFilter : "all");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const selected = customers.find((customer) => customer.id === selectedId) || customers[0];

  const visibleCustomers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return customers.filter((customer) => {
      const matchesQuery = !needle || `${customer.name} ${customer.email} ${customer.phone || ""}`.toLowerCase().includes(needle);
      const matchesFilter = filter === "all"
        || (filter === "members" && customer.membership_id)
        || (filter === "leads" && !customer.membership_id)
        || (filter === "attention" && ["past_due", "unpaid", "incomplete"].includes(customer.membership_status));
      return matchesQuery && matchesFilter;
    });
  }, [customers, filter, query]);

  const customerVehicles = selected ? vehicles.filter((vehicle) => vehicle.user_id === selected.id) : [];
  const customerAppointments = selected ? appointments.filter((appointment) => appointment.user_id === selected.id).sort((a, b) => String(b.preferred_date).localeCompare(String(a.preferred_date))).slice(0, 5) : [];
  const activeMembers = customers.filter((customer) => ["active", "trialing"].includes(customer.membership_status)).length;
  const leads = customers.filter((customer) => !customer.membership_id).length;
  const attention = customers.filter((customer) => ["past_due", "unpaid", "incomplete"].includes(customer.membership_status)).length;

  async function saveCustomer(event) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    setMessage("");
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const response = await fetch(`/api/admin/customers/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Customer notes could not be saved.");
      setCustomers((items) => items.map((item) => item.id === selected.id ? { ...item, ...data.customer } : item));
      setMessage("Customer details saved.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="adminWorkspace">
      <header className="portalHeader adminCommandHeader">
        <div><span className="kicker">Customer operations</span><h1>Customers</h1><p>Review account health, internal notes, vehicles, and service history.</p></div>
        <Link className="button buttonLime" href="/admin/appointments?new=1"><CalendarClock size={17} /> New appointment</Link>
      </header>

      <section className="adminWorkspaceStats" aria-label="Customer summary">
        <div><span>Total accounts</span><strong>{customers.length}</strong></div>
        <div><span>Active members</span><strong>{activeMembers}</strong></div>
        <div><span>Membership leads</span><strong>{leads}</strong></div>
        <div><span>Needs attention</span><strong>{attention}</strong></div>
      </section>

      <section className="workspaceToolbar adminWorkspaceToolbar">
        <label className="workspaceSearch"><Search size={17} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, or phone" aria-label="Search customers" /></label>
        <div className="segmentedControl" role="tablist" aria-label="Customer status">
          {[['all','All'],['members','Members'],['leads','Leads'],['attention','Attention']].map(([value, label]) => <button type="button" role="tab" aria-selected={filter === value} onClick={() => setFilter(value)} key={value}>{label}</button>)}
        </div>
      </section>

      <div className="adminMasterDetail">
        <section className="adminCustomerList" aria-label="Customer accounts">
          <div className="adminListMeta"><span>{visibleCustomers.length} customers</span><small>Select an account to manage it</small></div>
          {visibleCustomers.map((customer) => {
            const plan = getPlan(customer.plan_code);
            return (
              <button className={`adminCustomerRow ${selected?.id === customer.id ? "adminCustomerRowActive" : ""}`} type="button" onClick={() => { setSelectedId(customer.id); setMessage(""); }} key={customer.id}>
                <span className="adminCustomerAvatar">{customer.name.slice(0, 1)}</span>
                <span><strong>{customer.name}</strong><small>{customer.email}</small></span>
                <span><strong>{plan?.name || "Lead"}</strong><small>{customer.vehicle_total} vehicle{customer.vehicle_total === 1 ? "" : "s"}</small></span>
                <span className={`statusPill status${customer.membership_status || "neutral"}`}>{customer.membership_status || "no plan"}</span>
              </button>
            );
          })}
          {!visibleCustomers.length && <div className="emptyState adminCompactEmpty"><UserRound size={24} /><strong>No matching customers</strong><p>Adjust the search or status filter.</p></div>}
        </section>

        {selected && (
          <aside className="adminCustomerDetail">
            <div className="adminCustomerDetailHeader"><span className="adminCustomerAvatar adminCustomerAvatarLarge">{selected.name.slice(0, 1)}</span><div><span className="kicker">Customer record</span><h2>{selected.name}</h2><p>Customer since {dateLabel(selected.created_at)}</p></div></div>

            <div className="adminContactGrid">
              <span><Mail size={15} /><small>Email</small><strong>{selected.email}</strong></span>
              <span><Phone size={15} /><small>Phone</small><strong>{selected.phone || "Not recorded"}</strong></span>
              <span><Wrench size={15} /><small>Last service</small><strong>{dateLabel(selected.last_visit_at)}</strong></span>
            </div>

            <form className="adminNotesForm" onSubmit={saveCustomer} key={selected.id}>
              <label><span>Phone</span><input type="tel" name="phone" defaultValue={selected.phone || ""} placeholder="(602) 555-0100" /></label>
              <label><span>Internal customer notes</span><textarea name="adminNotes" rows="4" defaultValue={selected.admin_notes || ""} placeholder="Preferences, contact instructions, or account context" /></label>
              <button className="button buttonDark" type="submit" disabled={busy}><Save size={16} /> {busy ? "Saving..." : "Save customer details"}</button>
              {message && <p className={`formMessage ${message.includes("saved") ? "formMessageSuccess" : "formMessageError"}`} role="status">{message}</p>}
            </form>

            <div className="adminDetailSection">
              <div className="adminDetailSectionHeading"><div><span className="kicker">Membership</span><h3>{getPlan(selected.plan_code)?.name || "No membership"}</h3></div>{selected.membership_id && <Link href={`/admin/memberships?membership=${selected.membership_id}`}>Manage <CreditCard size={15} /></Link>}</div>
              {selected.membership_id ? <div className="adminMembershipMini"><span><small>Status</small><strong className={`statusText statusText${selected.membership_status}`}>{selected.membership_status}</strong></span><span><small>Care slots</small><strong>{selected.vehicle_count}</strong></span><span><small>Next billing</small><strong>{dateLabel(selected.current_period_end)}</strong></span></div> : <p className="adminMutedCopy">This customer has not started recurring care yet.</p>}
            </div>

            <div className="adminDetailSection">
              <div className="adminDetailSectionHeading"><div><span className="kicker">Garage</span><h3>{customerVehicles.length} vehicle{customerVehicles.length === 1 ? "" : "s"}</h3></div><Link href={`/admin/vehicles?customer=${selected.id}&new=1`}>Add vehicle <CarFront size={15} /></Link></div>
              <div className="adminCustomerVehicles">{customerVehicles.map((vehicle) => <Link href={`/admin/vehicles?customer=${selected.id}&vehicle=${vehicle.id}`} key={vehicle.id}><span><CarFront size={17} /></span><div><strong>{vehicle.nickname || `${vehicle.year} ${vehicle.make}`}</strong><small>{vehicle.year} {vehicle.make} {vehicle.model}</small></div><i className={vehicle.covered ? "coverageDot coverageDotActive" : "coverageDot"} /></Link>)}{!customerVehicles.length && <p className="adminMutedCopy">No vehicles have been added.</p>}</div>
            </div>

            <div className="adminDetailSection">
              <div className="adminDetailSectionHeading"><div><span className="kicker">Service history</span><h3>Recent appointments</h3></div><Link href={`/admin/appointments?customer=${selected.id}`}>View schedule <CalendarClock size={15} /></Link></div>
              <div className="adminCustomerAppointments">{customerAppointments.map((appointment) => <div key={appointment.id}><span><strong>{new Date(appointment.preferred_date).getUTCDate()}</strong><small>{new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(new Date(appointment.preferred_date))}</small></span><div><strong>{appointment.nickname || `${appointment.make || ""} ${appointment.model || ""}`.trim() || "Vehicle"}</strong><small>{appointment.service_type.replaceAll("_", " ")}</small></div><span className={`statusPill status${appointment.status}`}>{appointment.status.replace("_", " ")}</span></div>)}{!customerAppointments.length && <p className="adminMutedCopy">No appointments are on this account.</p>}</div>
            </div>
            {preview && <small className="previewLine">Preview customer edits reset when the local server restarts.</small>}
          </aside>
        )}
      </div>
    </div>
  );
}
