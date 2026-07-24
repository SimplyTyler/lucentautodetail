"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  CalendarClock,
  CalendarPlus,
  CarFront,
  Check,
  Clock3,
  FileText,
  Mail,
  MessageSquareText,
  Phone,
  Plus,
  ReceiptText,
  RotateCcw,
  Save,
  Search,
  Tag,
  Trash2,
  UserRound,
  Wrench
} from "lucide-react";
import { contactMethods, customerTypes, lifecycleStages } from "../lib/crm";
import { getPlan } from "../lib/plans";

const activityOptions = [
  ["note", "Note"],
  ["call", "Call"],
  ["email", "Email"],
  ["text", "Text"],
  ["follow_up", "Follow-up"]
];

const activityIcons = {
  note: FileText,
  call: Phone,
  email: Mail,
  text: MessageSquareText,
  follow_up: Clock3
};

function dateLabel(value, empty = "Not recorded") {
  if (!value) return empty;
  const timeZone = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? "UTC" : "America/Phoenix";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone
  }).format(new Date(value));
}

function invoiceDate(seconds) {
  return seconds ? dateLabel(seconds * 1000) : "Not set";
}

function money(value, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 2
  }).format((value || 0) / 100);
}

function invoiceStatus(invoice) {
  if (invoice.status === "open" && invoice.due_date && invoice.due_date * 1000 < Date.now()) return "overdue";
  return invoice.status;
}

function todayInput() {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Phoenix"
  }).format(new Date());
}

function newActivityDraft() {
  return { activityType: "note", subject: "", details: "", dueDate: todayInput() };
}

export function AdminCustomerWorkspace({
  initialCustomers,
  vehicles,
  appointments,
  initialActivities,
  invoices,
  initialCustomerId,
  initialFilter,
  preview
}) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [activities, setActivities] = useState(initialActivities);
  const [selectedId, setSelectedId] = useState(initialCustomerId || initialCustomers[0]?.id || null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState(["all", "members", "leads", "attention", "followups"].includes(initialFilter) ? initialFilter : "all");
  const [busy, setBusy] = useState(false);
  const [busyActivity, setBusyActivity] = useState("");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("success");
  const [activityMessage, setActivityMessage] = useState("");
  const [activityDraft, setActivityDraft] = useState(newActivityDraft);
  const [confirmDelete, setConfirmDelete] = useState("");
  const selected = customers.find((customer) => customer.id === selectedId) || customers[0] || null;

  const openFollowUps = activities.filter((activity) => activity.activity_type === "follow_up" && !activity.completed_at);
  const dueFollowUps = openFollowUps.filter((activity) => new Date(activity.due_at).getTime() <= Date.now());

  const visibleCustomers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return customers.filter((customer) => {
      const customerFollowUps = openFollowUps.some((activity) => activity.user_id === customer.id);
      const searchText = [
        customer.name,
        customer.email,
        customer.phone,
        customer.company_name,
        customer.acquisition_source,
        ...(customer.tags || [])
      ].filter(Boolean).join(" ").toLowerCase();
      const matchesQuery = !needle || searchText.includes(needle);
      const matchesFilter = filter === "all"
        || (filter === "members" && customer.membership_id)
        || (filter === "leads" && ["lead", "prospect"].includes(customer.lifecycle_stage))
        || (filter === "attention" && (customer.lifecycle_stage === "at_risk" || ["past_due", "unpaid", "incomplete"].includes(customer.membership_status)))
        || (filter === "followups" && customerFollowUps);
      return matchesQuery && matchesFilter;
    });
  }, [customers, filter, openFollowUps, query]);

  const customerVehicles = selected ? vehicles.filter((vehicle) => vehicle.user_id === selected.id) : [];
  const customerAppointments = selected
    ? appointments.filter((appointment) => appointment.user_id === selected.id).sort((a, b) => String(b.preferred_date).localeCompare(String(a.preferred_date))).slice(0, 5)
    : [];
  const customerInvoices = selected
    ? invoices.filter((invoice) => invoice.user_id === selected.id).sort((a, b) => b.created - a.created).slice(0, 5)
    : [];
  const customerActivities = selected
    ? activities.filter((activity) => activity.user_id === selected.id).sort((a, b) => {
      const aTime = new Date(a.created_at || a.due_at).getTime();
      const bTime = new Date(b.created_at || b.due_at).getTime();
      return bTime - aTime;
    })
    : [];
  const customerOutstanding = customerInvoices.filter((invoice) => invoice.status === "open").reduce((sum, invoice) => sum + invoice.amount_remaining, 0);
  const activeMembers = customers.filter((customer) => ["active", "trialing"].includes(customer.membership_status)).length;
  const pipeline = customers.filter((customer) => ["lead", "prospect"].includes(customer.lifecycle_stage)).length;

  function chooseCustomer(id) {
    setSelectedId(id);
    setMessage("");
    setActivityMessage("");
    setActivityDraft(newActivityDraft());
    setConfirmDelete("");
  }

  async function saveCustomer(event) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    setMessage("");
    setMessageTone("success");
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const response = await fetch(`/api/admin/customers/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Customer details could not be saved.");
      setCustomers((items) => items.map((item) => item.id === selected.id ? { ...item, ...data.customer } : item));
      setMessage(data.warning || "Customer profile and Stripe billing details saved.");
      setMessageTone(data.warning ? "warning" : "success");
    } catch (error) {
      setMessage(error.message);
      setMessageTone("error");
    } finally {
      setBusy(false);
    }
  }

  async function addActivity(event) {
    event.preventDefault();
    if (!selected) return;
    setBusyActivity("create");
    setActivityMessage("");
    try {
      const response = await fetch(`/api/admin/customers/${selected.id}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activityDraft)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Activity could not be added.");
      setActivities((items) => [{ ...data.activity, customer_name: selected.name, customer_email: selected.email }, ...items]);
      setActivityDraft(newActivityDraft());
      setActivityMessage(activityDraft.activityType === "follow_up" ? "Follow-up scheduled." : "Activity added to the timeline.");
    } catch (error) {
      setActivityMessage(error.message);
    } finally {
      setBusyActivity("");
    }
  }

  async function updateActivity(activity, action) {
    setBusyActivity(activity.id);
    setActivityMessage("");
    try {
      const response = await fetch(`/api/admin/activities/${activity.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Follow-up could not be updated.");
      setActivities((items) => items.map((item) => item.id === activity.id ? { ...item, ...data.activity } : item));
      setActivityMessage(action === "complete" ? "Follow-up completed." : "Follow-up reopened.");
    } catch (error) {
      setActivityMessage(error.message);
    } finally {
      setBusyActivity("");
    }
  }

  async function deleteActivity(activity) {
    setBusyActivity(activity.id);
    setActivityMessage("");
    try {
      const response = await fetch(`/api/admin/activities/${activity.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Activity could not be deleted.");
      setActivities((items) => items.filter((item) => item.id !== activity.id));
      setConfirmDelete("");
      setActivityMessage("Timeline activity deleted.");
    } catch (error) {
      setActivityMessage(error.message);
    } finally {
      setBusyActivity("");
    }
  }

  return (
    <div className="adminWorkspace">
      <header className="portalHeader adminCommandHeader">
        <div>
          <span className="kicker">Customer relationships</span>
          <h1>Customers</h1>
          <p>Edit complete profiles, track conversations and follow-ups, and move from service history to billing without losing context.</p>
        </div>
        <Link className="button buttonLime" href="/admin/appointments?new=1"><CalendarPlus size={17} /> New appointment</Link>
      </header>

      <section className="adminWorkspaceStats" aria-label="Customer summary">
        <div><span>Total accounts</span><strong>{customers.length}</strong></div>
        <div><span>Active members</span><strong>{activeMembers}</strong></div>
        <div><span>Sales pipeline</span><strong>{pipeline}</strong></div>
        <div><span>Follow-ups due</span><strong>{dueFollowUps.length}</strong></div>
      </section>

      <section className="workspaceToolbar adminWorkspaceToolbar">
        <label className="workspaceSearch">
          <Search size={17} />
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customer, company, or tag" aria-label="Search customers" />
        </label>
        <div className="segmentedControl" role="tablist" aria-label="Customer status">
          {[["all", "All"], ["members", "Members"], ["leads", "Pipeline"], ["attention", "Attention"], ["followups", "Follow-ups"]].map(([value, label]) => (
            <button type="button" role="tab" aria-selected={filter === value} onClick={() => setFilter(value)} key={value}>{label}</button>
          ))}
        </div>
      </section>

      <div className="adminMasterDetail adminCrmLayout">
        <section className="adminCustomerList" aria-label="Customer accounts">
          <div className="adminListMeta"><span>{visibleCustomers.length} customers</span><small>Select a record to manage it</small></div>
          {visibleCustomers.map((customer) => {
            const plan = getPlan(customer.plan_code);
            const needsAttention = customer.lifecycle_stage === "at_risk" || ["past_due", "unpaid"].includes(customer.membership_status);
            const followUpCount = openFollowUps.filter((activity) => activity.user_id === customer.id).length;
            return (
              <button className={`adminCustomerRow ${selected?.id === customer.id ? "adminCustomerRowActive" : ""}`} type="button" onClick={() => chooseCustomer(customer.id)} key={customer.id}>
                <span className="adminCustomerAvatar">{customer.name.slice(0, 1)}</span>
                <span><strong>{customer.name}</strong><small>{customer.company_name || customer.email}</small></span>
                <span><strong>{plan?.name || customer.lifecycle_stage?.replace("_", " ") || "Lead"}</strong><small>{customer.vehicle_total} vehicle{customer.vehicle_total === 1 ? "" : "s"}{followUpCount ? ` / ${followUpCount} follow-up${followUpCount === 1 ? "" : "s"}` : ""}</small></span>
                <span className={`statusPill status${needsAttention ? "overdue" : customer.membership_status || customer.lifecycle_stage || "neutral"}`}>{needsAttention ? "attention" : customer.membership_status || customer.lifecycle_stage || "lead"}</span>
              </button>
            );
          })}
          {!visibleCustomers.length && <div className="emptyState adminCompactEmpty"><UserRound size={24} /><strong>No matching customers</strong><p>Adjust the search or status filter.</p></div>}
        </section>

        {selected && (
          <aside className="adminCustomerDetail adminCrmCustomerDetail">
            <div className="adminCustomerDetailHeader adminCrmHeader">
              <span className="adminCustomerAvatar adminCustomerAvatarLarge">{selected.name.slice(0, 1)}</span>
              <div><span className="kicker">{selected.customer_type?.replace("_", " ") || "Customer"} record</span><h2>{selected.name}</h2><p>Customer since {dateLabel(selected.created_at)}</p></div>
              <span className={`statusPill status${selected.lifecycle_stage || "lead"}`}>{(selected.lifecycle_stage || "lead").replace("_", " ")}</span>
            </div>

            <div className="adminCrmQuickActions" aria-label="Customer actions">
              <Link href={`/admin/appointments?new=1&customer=${selected.id}`}><CalendarClock size={16} /><span>Appointment</span></Link>
              <Link href={`/admin/invoices?new=1&customer=${selected.id}`}><ReceiptText size={16} /><span>Invoice</span></Link>
              <Link href={`/admin/vehicles?new=1&customer=${selected.id}`}><CarFront size={16} /><span>Vehicle</span></Link>
              <a href={`mailto:${selected.email}`}><Mail size={16} /><span>Email</span></a>
            </div>

            <div className="adminContactGrid adminCrmContactGrid">
              <span><Mail size={15} /><small>Email</small><strong>{selected.email}</strong></span>
              <span><Phone size={15} /><small>Phone</small><strong>{selected.phone || "Not recorded"}</strong></span>
              <span><Wrench size={15} /><small>Last service</small><strong>{dateLabel(selected.last_visit_at, "No completed visits")}</strong></span>
              <span><MessageSquareText size={15} /><small>Prefers</small><strong>{selected.preferred_contact || "email"}</strong></span>
            </div>

            <section className="adminCrmSection">
              <div className="adminCrmSectionHeading"><div><span className="kicker">Account profile</span><h3>Customer and billing details</h3></div><span><Save size={15} /> Synced to Stripe when linked</span></div>
              <form className="adminCrmProfileForm" onSubmit={saveCustomer} key={selected.id}>
                <label><span>Customer name</span><input name="name" defaultValue={selected.name || ""} required /></label>
                <label><span>Email</span><input type="email" name="email" defaultValue={selected.email || ""} required /></label>
                <label><span>Phone</span><input type="tel" name="phone" defaultValue={selected.phone || ""} placeholder="(602) 555-0100" /></label>
                <label><span>Company</span><input name="companyName" defaultValue={selected.company_name || ""} placeholder="Optional company or fleet" /></label>
                <label><span>Customer type</span><select name="customerType" defaultValue={selected.customer_type || "consumer"}>{customerTypes.map((item) => <option value={item.code} key={item.code}>{item.name}</option>)}</select></label>
                <label><span>Lifecycle stage</span><select name="lifecycleStage" defaultValue={selected.lifecycle_stage || "lead"}>{lifecycleStages.map((item) => <option value={item.code} key={item.code}>{item.name}</option>)}</select></label>
                <label><span>Preferred contact</span><select name="preferredContact" defaultValue={selected.preferred_contact || "email"}>{contactMethods.map((item) => <option value={item.code} key={item.code}>{item.name}</option>)}</select></label>
                <label><span>Lead source</span><input name="acquisitionSource" defaultValue={selected.acquisition_source || ""} placeholder="Referral, Google, event..." /></label>
                <label className="formSpan"><span>Street address</span><input name="addressLine1" defaultValue={selected.address_line1 || ""} placeholder="Address line 1" /></label>
                <label className="formSpan"><span>Suite, unit, or building</span><input name="addressLine2" defaultValue={selected.address_line2 || ""} placeholder="Address line 2" /></label>
                <label><span>City</span><input name="city" defaultValue={selected.city || ""} /></label>
                <label><span>State</span><input name="state" defaultValue={selected.state || ""} maxLength="3" /></label>
                <label><span>Postal code</span><input name="postalCode" defaultValue={selected.postal_code || ""} /></label>
                <label><span>Country</span><input name="country" defaultValue={selected.country || "US"} maxLength="2" /></label>
                <label className="formSpan"><span>Tags</span><div className="adminTagInput"><Tag size={15} /><input name="tags" defaultValue={(selected.tags || []).join(", ")} placeholder="collector, priority, fleet" /></div></label>
                <label className="formSpan"><span>Internal customer notes</span><textarea name="adminNotes" rows="4" defaultValue={selected.admin_notes || ""} placeholder="Preferences, access instructions, billing context, or relationship notes" /></label>
                <div className="adminCrmSaveBar formSpan">
                  <span>{message && <small className={`formMessage${messageTone[0].toUpperCase()}${messageTone.slice(1)}`} role="status">{message}</small>}</span>
                  <button className="button buttonDark" type="submit" disabled={busy}><Save size={16} /> {busy ? "Saving..." : "Save profile"}</button>
                </div>
              </form>
            </section>

            <section className="adminCrmSection">
              <div className="adminCrmSectionHeading">
                <div><span className="kicker">Billing</span><h3>Membership and invoices</h3></div>
                <Link href={`/admin/invoices?new=1&customer=${selected.id}`}>New invoice <Plus size={15} /></Link>
              </div>
              <div className="adminCrmBillingBand">
                <span><small>Membership</small><strong>{getPlan(selected.plan_code)?.name || "No membership"}</strong>{selected.membership_id && <Link href={`/admin/memberships?membership=${selected.membership_id}`}>Manage</Link>}</span>
                <span><small>Membership status</small><strong className={`statusText statusText${selected.membership_status || "neutral"}`}>{selected.membership_status || "Not enrolled"}</strong></span>
                <span><small>Invoice balance</small><strong>{money(customerOutstanding)}</strong></span>
              </div>
              <div className="adminCrmInvoiceList">
                {customerInvoices.map((invoice) => (
                  <Link href={`/admin/invoices?invoice=${invoice.id}`} key={invoice.id}>
                    <span className={`adminInvoiceStatusMark adminInvoiceStatusMark${invoiceStatus(invoice)}`} />
                    <span><strong>{invoice.number || "Draft invoice"}</strong><small>{invoice.description || invoice.vehicle_label || "Service invoice"}</small></span>
                    <span><strong>{money(invoice.total, invoice.currency)}</strong><small>{invoiceDate(invoice.due_date || invoice.created)}</small></span>
                    <span className={`statusPill status${invoiceStatus(invoice)}`}>{invoiceStatus(invoice)}</span>
                    <ArrowUpRight size={15} />
                  </Link>
                ))}
                {!customerInvoices.length && <p className="adminMutedCopy">No Stripe invoices are attached to this customer yet.</p>}
              </div>
            </section>

            <section className="adminCrmSection adminCrmRelationship">
              <div className="adminCrmSectionHeading"><div><span className="kicker">Relationship</span><h3>Activity and follow-ups</h3></div><span>{customerActivities.length} timeline item{customerActivities.length === 1 ? "" : "s"}</span></div>
              <form className="adminActivityComposer" onSubmit={addActivity}>
                <label><span>Activity</span><select value={activityDraft.activityType} onChange={(event) => setActivityDraft((current) => ({ ...current, activityType: event.target.value }))}>{activityOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
                <label className={activityDraft.activityType === "follow_up" ? "" : "adminActivitySubjectWide"}><span>Subject</span><input value={activityDraft.subject} onChange={(event) => setActivityDraft((current) => ({ ...current, subject: event.target.value }))} maxLength="140" required placeholder="Short summary" /></label>
                {activityDraft.activityType === "follow_up" && <label><span>Due date</span><input type="date" value={activityDraft.dueDate} onChange={(event) => setActivityDraft((current) => ({ ...current, dueDate: event.target.value }))} required /></label>}
                <label className="formSpan"><span>Details</span><textarea rows="3" value={activityDraft.details} onChange={(event) => setActivityDraft((current) => ({ ...current, details: event.target.value }))} maxLength="2000" placeholder="Conversation details, next step, or internal context" /></label>
                <div className="adminActivityComposerActions formSpan"><span>{activityMessage && <small className={activityMessage.includes("could") ? "formMessageError" : "formMessageSuccess"} role="status">{activityMessage}</small>}</span><button className="button buttonDark" type="submit" disabled={busyActivity === "create"}><Plus size={16} /> {busyActivity === "create" ? "Adding..." : "Add activity"}</button></div>
              </form>

              <div className="adminActivityTimeline">
                {customerActivities.map((activity) => {
                  const Icon = activityIcons[activity.activity_type] || FileText;
                  const overdue = activity.activity_type === "follow_up" && !activity.completed_at && new Date(activity.due_at).getTime() < Date.now();
                  return (
                    <article className={`adminActivityItem ${activity.completed_at ? "adminActivityItemComplete" : ""}`} key={activity.id}>
                      <span className={`adminActivityIcon adminActivityIcon${activity.activity_type}`}><Icon size={16} /></span>
                      <div>
                        <span>{activity.activity_type.replace("_", " ")} / {dateLabel(activity.created_at)}</span>
                        <strong>{activity.subject}</strong>
                        {activity.details && <p>{activity.details}</p>}
                        {activity.activity_type === "follow_up" && <small className={overdue ? "adminDueOverdue" : ""}>{activity.completed_at ? `Completed ${dateLabel(activity.completed_at)}` : `${overdue ? "Overdue" : "Due"} ${dateLabel(activity.due_at)}`}</small>}
                      </div>
                      <div className="adminActivityActions">
                        {activity.activity_type === "follow_up" && (
                          <button className="iconButton" type="button" disabled={busyActivity === activity.id} aria-label={activity.completed_at ? "Reopen follow-up" : "Complete follow-up"} title={activity.completed_at ? "Reopen follow-up" : "Complete follow-up"} onClick={() => updateActivity(activity, activity.completed_at ? "reopen" : "complete")}>
                            {activity.completed_at ? <RotateCcw size={15} /> : <Check size={16} />}
                          </button>
                        )}
                        <button className="iconButton" type="button" disabled={busyActivity === activity.id} aria-label="Delete activity" title="Delete activity" onClick={() => setConfirmDelete(confirmDelete === activity.id ? "" : activity.id)}><Trash2 size={15} /></button>
                      </div>
                      {confirmDelete === activity.id && <div className="adminActivityConfirm"><span>Delete this timeline item?</span><button type="button" onClick={() => setConfirmDelete("")}>Keep</button><button type="button" disabled={busyActivity === activity.id} onClick={() => deleteActivity(activity)}>Delete</button></div>}
                    </article>
                  );
                })}
                {!customerActivities.length && <div className="emptyState adminCompactEmpty"><MessageSquareText size={24} /><strong>No relationship activity yet</strong><p>Add a note, contact event, or follow-up above.</p></div>}
              </div>
            </section>

            <section className="adminCrmSection adminCrmSplitSections">
              <div>
                <div className="adminCrmSectionHeading"><div><span className="kicker">Garage</span><h3>{customerVehicles.length} vehicle{customerVehicles.length === 1 ? "" : "s"}</h3></div><Link href={`/admin/vehicles?customer=${selected.id}&new=1`}>Add <CarFront size={15} /></Link></div>
                <div className="adminCustomerVehicles">
                  {customerVehicles.map((vehicle) => <Link href={`/admin/vehicles?customer=${selected.id}&vehicle=${vehicle.id}`} key={vehicle.id}><span><CarFront size={17} /></span><div><strong>{vehicle.nickname || `${vehicle.year} ${vehicle.make}`}</strong><small>{vehicle.year} {vehicle.make} {vehicle.model}</small></div><i className={vehicle.covered ? "coverageDot coverageDotActive" : "coverageDot"} /></Link>)}
                  {!customerVehicles.length && <p className="adminMutedCopy">No vehicles have been added.</p>}
                </div>
              </div>
              <div>
                <div className="adminCrmSectionHeading"><div><span className="kicker">Service history</span><h3>Recent appointments</h3></div><Link href={`/admin/appointments?customer=${selected.id}`}>Schedule <CalendarClock size={15} /></Link></div>
                <div className="adminCustomerAppointments">
                  {customerAppointments.map((appointment) => <div key={appointment.id}><span><strong>{new Date(appointment.preferred_date).getUTCDate()}</strong><small>{new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(new Date(appointment.preferred_date))}</small></span><div><strong>{appointment.nickname || `${appointment.make || ""} ${appointment.model || ""}`.trim() || "Vehicle"}</strong><small>{appointment.service_type.replaceAll("_", " ")}</small></div><span className={`statusPill status${appointment.status}`}>{appointment.status.replace("_", " ")}</span></div>)}
                  {!customerAppointments.length && <p className="adminMutedCopy">No appointments are on this account.</p>}
                </div>
              </div>
            </section>

            {preview && <small className="previewLine">Preview CRM edits and activities reset when the local server restarts.</small>}
          </aside>
        )}
      </div>
    </div>
  );
}
