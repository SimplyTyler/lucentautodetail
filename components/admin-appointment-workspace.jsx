"use client";

import { useMemo, useState } from "react";
import { CalendarClock, Check, CheckCircle2, Clock3, MapPin, Pencil, Play, Plus, Search, UserRound, Wrench, X } from "lucide-react";
import { visitLocations, visitServices, visitWindows } from "../lib/visits";

function businessDate() {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Phoenix", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function dateLabel(value, weekday = true) {
  if (!value) return "Date pending";
  return new Intl.DateTimeFormat("en-US", { weekday: weekday ? "short" : undefined, month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}

function optionName(options, code, fallback) {
  return options.find((item) => item.code === code)?.name || fallback;
}

function AppointmentForm({ appointment, customers, vehicles, busy, message, onSubmit, onClose }) {
  const [userId, setUserId] = useState(appointment?.user_id || customers[0]?.id || "");
  const [location, setLocation] = useState(appointment?.service_location || "home");
  const customer = customers.find((item) => item.id === userId);
  const customerVehicles = vehicles.filter((vehicle) => vehicle.user_id === userId);
  const minimumDate = businessDate();

  return (
    <form className="adminAppointmentForm" onSubmit={onSubmit} key={appointment?.id || "new-appointment"}>
      <div className="adminEditorHeading formSpan"><div><span className="kicker">{appointment?.id ? "Appointment details" : "New appointment"}</span><h2>{appointment?.id ? `Manage ${appointment.customer_name}` : "Add to the schedule"}</h2></div><button className="iconButton" type="button" aria-label="Close appointment editor" onClick={onClose}><X size={18} /></button></div>
      {appointment?.id ? <div className="adminLockedField formSpan"><UserRound size={16} /><span><small>Customer</small><strong>{appointment.customer_name}</strong></span><input type="hidden" name="userId" value={appointment.user_id} /></div> : <label className="formSpan"><span>Customer</span><select name="userId" value={userId} onChange={(event) => setUserId(event.target.value)} required>{customers.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>}
      <label className="formSpan"><span>Vehicle</span><select name="vehicleId" defaultValue={appointment?.vehicle_id || ""} required><option value="" disabled>Select a vehicle</option>{customerVehicles.map((vehicle) => <option value={vehicle.id} key={vehicle.id}>{vehicle.nickname || `${vehicle.year} ${vehicle.make}`} - {vehicle.year} {vehicle.make} {vehicle.model}</option>)}</select>{!customerVehicles.length && <small className="fieldHint">{customer?.name || "This customer"} has no vehicles in the registry.</small>}</label>
      <label><span>Service</span><select name="serviceType" defaultValue={appointment?.service_type || "membership_detail"}>{visitServices.map((service) => <option value={service.code} key={service.code}>{service.name} - {service.duration}</option>)}</select></label>
      <label><span>Status</span><select name="status" defaultValue={appointment?.status || "confirmed"}><option value="requested">Requested</option><option value="confirmed">Confirmed</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></label>
      <label><span>Service date</span><input name="preferredDate" type="date" min={appointment?.id ? undefined : minimumDate} defaultValue={appointment?.preferred_date ? String(appointment.preferred_date).slice(0, 10) : ""} required /></label>
      <label><span>Arrival window</span><select name="preferredWindow" defaultValue={appointment?.preferred_window || "morning"}>{visitWindows.map((window) => <option value={window.code} key={window.code}>{window.name} - {window.detail}</option>)}</select></label>
      <label><span>Location</span><select name="serviceLocation" value={location} onChange={(event) => setLocation(event.target.value)}>{visitLocations.map((item) => <option value={item.code} key={item.code}>{item.name}</option>)}</select></label>
      <label><span>Assigned detailer</span><input name="assignedDetailer" defaultValue={appointment?.assigned_detailer || ""} placeholder="Unassigned" /></label>
      {location === "studio" ? <div className="studioLocation formSpan"><MapPin size={16} /> Lucent studio appointment</div> : <label className="formSpan"><span>Service address</span><input name="serviceAddress" defaultValue={appointment?.service_address || ""} placeholder="Street, city, state, ZIP" required /></label>}
      <label className="formSpan"><span>Customer-visible notes</span><textarea name="notes" rows="3" defaultValue={appointment?.notes || ""} placeholder="Access instructions or service priorities" /></label>
      <label className="formSpan"><span>Internal operations notes</span><textarea name="adminNotes" rows="3" defaultValue={appointment?.admin_notes || ""} placeholder="Staff-only preparation, billing, or dispatch notes" /></label>
      <div className="formActions formSpan"><button className="button buttonOutline" type="button" onClick={onClose}>Cancel</button><button className="button buttonDark" type="submit" disabled={busy || !customerVehicles.length}>{busy ? "Saving..." : appointment?.id ? "Save appointment" : "Create appointment"}</button></div>
      {message && <p className="formMessage formMessageError formSpan" role="alert">{message}</p>}
    </form>
  );
}

export function AdminAppointmentWorkspace({ initialAppointments, customers, vehicles, initialCustomerId, initialStatus, openNew, preview }) {
  const [appointments, setAppointments] = useState(initialAppointments);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState(initialStatus || "open");
  const [editor, setEditor] = useState(openNew ? { user_id: initialCustomerId || customers[0]?.id || "" } : null);
  const [confirmId, setConfirmId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);
  const today = businessDate();

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return appointments.filter((appointment) => {
      const matchesQuery = !needle || `${appointment.customer_name} ${appointment.customer_email} ${appointment.make || ""} ${appointment.model || ""} ${appointment.nickname || ""} ${appointment.assigned_detailer || ""}`.toLowerCase().includes(needle);
      const matchesStatus = status === "all" || (status === "open" ? ["requested", "confirmed", "in_progress"].includes(appointment.status) : appointment.status === status);
      const matchesCustomer = !initialCustomerId || appointment.user_id === initialCustomerId;
      return matchesQuery && matchesStatus && matchesCustomer;
    }).sort((a, b) => status === "completed" || status === "cancelled" ? String(b.preferred_date).localeCompare(String(a.preferred_date)) : String(a.preferred_date).localeCompare(String(b.preferred_date)));
  }, [appointments, initialCustomerId, query, status]);

  function enrich(appointment, source = appointment) {
    const customer = customers.find((item) => item.id === source.user_id);
    const vehicle = vehicles.find((item) => item.id === source.vehicle_id);
    return { ...source, ...appointment, customer_name: appointment.customer_name || customer?.name, customer_email: appointment.customer_email || customer?.email, make: appointment.make || vehicle?.make, model: appointment.model || vehicle?.model, nickname: appointment.nickname || vehicle?.nickname };
  }

  async function submitAppointment(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setMessageIsError(false);
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    const editingId = editor?.id;
    try {
      const response = await fetch(editingId ? `/api/admin/appointments/${editingId}` : "/api/admin/appointments", { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Appointment could not be saved.");
      const saved = enrich(data.appointment, editingId ? { ...editor, ...payload, vehicle_id: payload.vehicleId, preferred_date: payload.preferredDate, preferred_window: payload.preferredWindow, service_type: payload.serviceType, service_location: payload.serviceLocation, service_address: payload.serviceAddress || null, admin_notes: payload.adminNotes || null, assigned_detailer: payload.assignedDetailer || null, status: payload.status } : { ...payload, user_id: payload.userId, vehicle_id: payload.vehicleId, preferred_date: payload.preferredDate, preferred_window: payload.preferredWindow, service_type: payload.serviceType, service_location: payload.serviceLocation, service_address: payload.serviceAddress || null, admin_notes: payload.adminNotes || null, assigned_detailer: payload.assignedDetailer || null, status: payload.status });
      setAppointments((items) => editingId ? items.map((item) => item.id === editingId ? saved : item) : [...items, saved]);
      setEditor(null);
      setStatus("open");
      setMessage(editingId ? "Appointment updated." : "Appointment created and added to the schedule.");
    } catch (error) {
      setMessageIsError(true);
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(appointment, nextStatus) {
    setBusy(true);
    setMessage("");
    setMessageIsError(false);
    try {
      const action = nextStatus === "cancelled" ? "cancel" : "status";
      const response = await fetch(`/api/admin/appointments/${appointment.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, status: nextStatus }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Appointment status could not be changed.");
      setAppointments((items) => items.map((item) => item.id === appointment.id ? { ...item, ...data.appointment, status: nextStatus } : item));
      setConfirmId(null);
      setMessage(nextStatus === "cancelled" ? "Appointment cancelled." : `Appointment marked ${nextStatus.replace("_", " ")}.`);
    } catch (error) {
      setMessageIsError(true);
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  const counts = {
    today: appointments.filter((item) => String(item.preferred_date).slice(0, 10) === today && item.status !== "cancelled").length,
    requested: appointments.filter((item) => item.status === "requested").length,
    inProgress: appointments.filter((item) => item.status === "in_progress").length,
    completed: appointments.filter((item) => item.status === "completed").length
  };

  return (
    <div className="adminWorkspace">
      <header className="portalHeader adminCommandHeader"><div><span className="kicker">Service operations</span><h1>Appointments</h1><p>Create, assign, reschedule, progress, and close every customer visit.</p></div><button className="button buttonLime" type="button" onClick={() => { setEditor({ user_id: initialCustomerId || customers[0]?.id || "" }); setMessage(""); }}><Plus size={17} /> New appointment</button></header>
      <section className="adminWorkspaceStats" aria-label="Appointment summary"><div><span>Today</span><strong>{counts.today}</strong></div><div><span>Awaiting confirmation</span><strong>{counts.requested}</strong></div><div><span>In progress</span><strong>{counts.inProgress}</strong></div><div><span>Completed</span><strong>{counts.completed}</strong></div></section>
      <section className="workspaceToolbar adminWorkspaceToolbar"><label className="workspaceSearch"><Search size={17} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customer, vehicle, or detailer" aria-label="Search appointments" /></label><div className="segmentedControl" role="tablist" aria-label="Appointment status">{[["open","Open"],["requested","Requested"],["confirmed","Confirmed"],["in_progress","In progress"],["completed","Completed"],["cancelled","Cancelled"]].map(([value,label]) => <button type="button" role="tab" aria-selected={status === value} onClick={() => setStatus(value)} key={value}>{label}<span>{value === "open" ? appointments.filter((item) => ["requested","confirmed","in_progress"].includes(item.status)).length : appointments.filter((item) => item.status === value).length}</span></button>)}</div></section>
      {message && !editor && <p className={`workspaceMessage formMessage ${messageIsError ? "formMessageError" : "formMessageSuccess"}`} role="status">{message}</p>}

      <div className={`adminAppointmentLayout ${editor ? "adminAppointmentLayoutEditing" : ""}`}>
        <section className="adminAppointmentList">
          <div className="adminListMeta"><span>{visible.length} appointments</span><small>{initialCustomerId ? "Filtered to selected customer" : "Live operations schedule"}</small></div>
          {visible.map((appointment) => <article className="adminAppointmentRow" key={appointment.id}>
            <div className="adminAppointmentDate"><strong>{new Date(appointment.preferred_date).getUTCDate()}</strong><span>{new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(new Date(appointment.preferred_date))}</span><small>{new Date(appointment.preferred_date).getUTCFullYear()}</small></div>
            <div className="adminAppointmentPrimary"><span>{optionName(visitServices, appointment.service_type, "Detail service")}</span><h2>{appointment.customer_name}</h2><p>{appointment.nickname || `${appointment.make || ""} ${appointment.model || ""}`.trim() || "Vehicle pending"}</p></div>
            <div className="adminAppointmentMeta"><span><Clock3 size={15} /><small>Window</small><strong>{optionName(visitWindows, appointment.preferred_window, "Flexible")}</strong></span><span><MapPin size={15} /><small>Location</small><strong>{appointment.service_location === "studio" ? "Studio" : optionName(visitLocations, appointment.service_location, "Mobile")}</strong></span><span><Wrench size={15} /><small>Detailer</small><strong>{appointment.assigned_detailer || "Unassigned"}</strong></span></div>
            <span className={`statusPill status${appointment.status}`}>{appointment.status.replace("_", " ")}</span>
            <div className="adminAppointmentActions"><button className="iconButton" type="button" aria-label={`Edit appointment for ${appointment.customer_name}`} title="Edit or reschedule" onClick={() => { setEditor(appointment); setConfirmId(null); setMessage(""); }}><Pencil size={16} /></button>{appointment.status === "requested" && <button className="button buttonOutline" type="button" disabled={busy} onClick={() => changeStatus(appointment, "confirmed")}><Check size={15} /> Confirm</button>}{appointment.status === "confirmed" && <button className="button buttonOutline" type="button" disabled={busy} onClick={() => changeStatus(appointment, "in_progress")}><Play size={15} /> Start</button>}{appointment.status === "in_progress" && <button className="button buttonOutline" type="button" disabled={busy} onClick={() => changeStatus(appointment, "completed")}><CheckCircle2 size={15} /> Complete</button>}{!["completed","cancelled"].includes(appointment.status) && <button className="textButtonDanger" type="button" onClick={() => setConfirmId(appointment.id)}>Cancel</button>}</div>
            {appointment.admin_notes && <div className="adminInternalNote"><strong>Internal</strong><span>{appointment.admin_notes}</span></div>}
            {confirmId === appointment.id && <div className="confirmStrip"><span><strong>Cancel this appointment?</strong><small>The customer visit will move to cancelled history.</small></span><button className="button buttonOutline" type="button" onClick={() => setConfirmId(null)}>Keep</button><button className="button buttonDanger" type="button" disabled={busy} onClick={() => changeStatus(appointment, "cancelled")}>{busy ? "Cancelling..." : "Cancel appointment"}</button></div>}
          </article>)}
          {!visible.length && <div className="emptyState adminRegistryEmpty"><CalendarClock size={26} /><strong>No matching appointments</strong><p>Change the status filter or add a customer visit.</p></div>}
        </section>
        {editor && <aside className="adminEditorPanel adminAppointmentEditor"><AppointmentForm appointment={editor} customers={customers} vehicles={vehicles} busy={busy} message={message} onSubmit={submitAppointment} onClose={() => { setEditor(null); setMessage(""); }} />{preview && <small className="previewLine">Preview schedule changes reset when the local server restarts.</small>}</aside>}
      </div>
    </div>
  );
}
