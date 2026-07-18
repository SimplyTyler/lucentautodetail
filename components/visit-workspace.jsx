"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarDays, CalendarPlus, CheckCircle2, Clock3, MapPin, Pencil, RotateCcw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { visitLocations, visitServices, visitWindows } from "../lib/visits";

function dateLabel(value) {
  if (!value) return "Date pending";
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}

function optionName(options, code, fallback) {
  return options.find((item) => item.code === code)?.name || fallback;
}

function vehicleName(request) {
  return request.nickname || [request.make, request.model].filter(Boolean).join(" ") || "Member vehicle";
}

function VisitForm({ vehicles, initialRequest = null, busy, message, onSubmit, onClose }) {
  const [location, setLocation] = useState(initialRequest?.service_location || "home");
  const minimumDate = new Date().toISOString().slice(0, 10);

  return (
    <form className="visitPlannerForm" onSubmit={onSubmit} key={initialRequest?.id || "new-visit"}>
      <div className="visitPlannerHeading formSpan"><div><span className="kicker">{initialRequest ? "Reschedule" : "Plan a visit"}</span><h2>{initialRequest ? `Update ${vehicleName(initialRequest)}` : "Choose the care window"}</h2></div>{onClose && <button className="iconButton" type="button" aria-label="Close planner" title="Close" onClick={onClose}><X size={18} /></button>}</div>
      <label><span>Vehicle</span><select name="vehicleId" required defaultValue={initialRequest?.vehicle_id || ""}><option value="" disabled>Select a vehicle</option>{vehicles.map((vehicle) => <option value={vehicle.id} key={vehicle.id}>{vehicle.nickname ? `${vehicle.nickname} - ` : ""}{vehicle.year} {vehicle.make} {vehicle.model}</option>)}</select></label>
      <label><span>Service</span><select name="serviceType" defaultValue={initialRequest?.service_type || "membership_detail"}>{visitServices.map((service) => <option value={service.code} key={service.code}>{service.name} - {service.duration}</option>)}</select></label>
      <label><span>Preferred date</span><input name="preferredDate" type="date" min={minimumDate} defaultValue={initialRequest?.preferred_date ? String(initialRequest.preferred_date).slice(0, 10) : ""} required /></label>
      <label><span>Arrival window</span><select name="preferredWindow" defaultValue={initialRequest?.preferred_window || "morning"}>{visitWindows.map((window) => <option value={window.code} key={window.code}>{window.name} - {window.detail}</option>)}</select></label>
      <label><span>Service location</span><select name="serviceLocation" value={location} onChange={(event) => setLocation(event.target.value)}>{visitLocations.map((item) => <option value={item.code} key={item.code}>{item.name}</option>)}</select></label>
      {location !== "studio" ? <label><span>Service address</span><input name="serviceAddress" type="text" defaultValue={initialRequest?.service_address || ""} placeholder="Street, city, state, ZIP" required /></label> : <div className="studioLocation"><MapPin size={17} /><span><strong>Lucent studio</strong><small>Drop-off details arrive with confirmation.</small></span></div>}
      <label className="formSpan"><span>Notes for the detailer</span><textarea name="notes" rows="4" defaultValue={initialRequest?.notes || ""} placeholder="Access instructions, priority areas, paint or cabin notes" /></label>
      <div className="formActions formSpan">{onClose && <button className="button buttonOutline" type="button" onClick={onClose}>Cancel</button>}<button className="button buttonDark" type="submit" disabled={busy || !vehicles.length}>{busy ? "Saving..." : initialRequest ? "Request new window" : "Send visit request"}</button></div>
      {message && <p className={`formMessage ${message.startsWith("Visit") ? "formMessageSuccess" : "formMessageError"} formSpan`} role="status">{message}</p>}
    </form>
  );
}

export function VisitWorkspace({ vehicles = [], initialRequests = [], preview = false }) {
  const router = useRouter();
  const [requests, setRequests] = useState(initialRequests);
  const [view, setView] = useState("upcoming");
  const [plannerOpen, setPlannerOpen] = useState(!initialRequests.length);
  const [editing, setEditing] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const upcoming = useMemo(() => requests
    .filter((request) => !["completed", "cancelled"].includes(request.status))
    .sort((a, b) => new Date(a.preferred_date) - new Date(b.preferred_date)), [requests]);
  const history = useMemo(() => requests
    .filter((request) => ["completed", "cancelled"].includes(request.status))
    .sort((a, b) => new Date(b.preferred_date) - new Date(a.preferred_date)), [requests]);
  const visibleRequests = view === "upcoming" ? upcoming : history;

  function enrichRequest(request) {
    const vehicle = vehicles.find((item) => item.id === request.vehicle_id);
    return vehicle ? { ...request, make: vehicle.make, model: vehicle.model, nickname: vehicle.nickname } : request;
  }

  async function submitNew(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/service-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Visit could not be requested.");
      setRequests((items) => [enrichRequest(data.request), ...items]);
      setMessage("Visit request received. Lucent will confirm the window shortly.");
      setPlannerOpen(false);
      setView("upcoming");
      if (!preview) router.refresh();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function reschedule(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/service-requests/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Visit could not be updated.");
      const updated = enrichRequest(data.request);
      setRequests((items) => items.map((item) => item.id === editing.id ? { ...item, ...updated } : item));
      setEditing(null);
      setMessage("Visit window updated. Confirmation is pending again.");
      if (!preview) router.refresh();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function cancelVisit(id) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/service-requests/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "cancel" }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Visit could not be cancelled.");
      setRequests((items) => items.map((item) => item.id === id ? { ...item, status: "cancelled" } : item));
      setConfirmId(null);
      if (!preview) router.refresh();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="visitWorkspace">
      <header className="portalHeader portalSubpageHeader">
        <div><span className="kicker">Schedule</span><h1>Visits</h1><p>Request care, choose an arrival window, and keep every visit organized.</p></div>
        <button className="button buttonLime" type="button" disabled={!vehicles.length} onClick={() => { setPlannerOpen((value) => !value); setEditing(null); setMessage(""); }}>{plannerOpen ? <X size={17} /> : <CalendarPlus size={17} />}{plannerOpen ? "Close planner" : "Plan a visit"}</button>
      </header>

      {!vehicles.length && <div className="actionNotice"><CarFrontFallback /><div><strong>Add a vehicle before planning a visit.</strong><p>Your service request needs a vehicle profile with the care details attached.</p></div><Link className="button buttonDark" href="/portal/vehicles">Add a vehicle</Link></div>}

      {plannerOpen && vehicles.length > 0 && <section className="visitPlanner"><VisitForm vehicles={vehicles} busy={busy} message={message} onSubmit={submitNew} onClose={() => { setPlannerOpen(false); setMessage(""); }} /></section>}

      <section className="visitScheduleHeader">
        <div className="segmentedControl" role="tablist" aria-label="Visit schedule">
          <button type="button" role="tab" aria-selected={view === "upcoming"} onClick={() => setView("upcoming")}>Upcoming <span>{upcoming.length}</span></button>
          <button type="button" role="tab" aria-selected={view === "history"} onClick={() => setView("history")}>History <span>{history.length}</span></button>
        </div>
        <p>{view === "upcoming" ? "Requested and confirmed service windows" : "Completed and cancelled visits"}</p>
      </section>

      {message && !plannerOpen && !editing && <p className={`formMessage ${message.startsWith("Visit") ? "formMessageSuccess" : "formMessageError"} workspaceMessage`} role="status">{message}</p>}

      <section className="visitTimeline">
        {visibleRequests.map((request) => (
          <article className="visitCard" key={request.id}>
            <div className="visitCardDate"><strong>{new Date(request.preferred_date).getUTCDate()}</strong><span>{new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(new Date(request.preferred_date))}</span><small>{new Date(request.preferred_date).getUTCFullYear()}</small></div>
            <div className="visitCardBody">
              <div className="visitCardTitle"><div><span>{optionName(visitServices, request.service_type, "Membership detail")}</span><h2>{vehicleName(request)}</h2></div><span className={`statusPill status${request.status}`}>{request.status}</span></div>
              <div className="visitMetaGrid">
                <span><Clock3 size={16} /><small>Arrival window</small><strong>{optionName(visitWindows, request.preferred_window, "Pending")}</strong></span>
                <span><MapPin size={16} /><small>Location</small><strong>{request.service_location === "studio" ? "Lucent studio" : optionName(visitLocations, request.service_location, "Mobile")}</strong></span>
                <span><CalendarDays size={16} /><small>Date</small><strong>{dateLabel(request.preferred_date)}</strong></span>
              </div>
              {request.service_location !== "studio" && request.service_address && <p className="visitAddress">{request.service_address}</p>}
              {request.notes && <p className="visitNotes">{request.notes}</p>}

              {["requested", "confirmed"].includes(request.status) && (
                <div className="visitCardActions">
                  <button className="button buttonOutline" type="button" onClick={() => { setEditing(request); setPlannerOpen(false); setConfirmId(null); setMessage(""); }}><Pencil size={15} /> Reschedule</button>
                  <button className="textButtonDanger" type="button" onClick={() => setConfirmId(request.id)}>Cancel request</button>
                </div>
              )}
              {request.status === "completed" && <div className="completedLine"><CheckCircle2 size={16} /> Service completed</div>}
              {confirmId === request.id && <div className="confirmStrip"><span><strong>Cancel this request?</strong><small>The service window will be released.</small></span><button className="button buttonOutline" type="button" onClick={() => setConfirmId(null)}>Keep visit</button><button className="button buttonDanger" type="button" disabled={busy} onClick={() => cancelVisit(request.id)}>{busy ? "Cancelling..." : "Cancel visit"}</button></div>}
            </div>
          </article>
        ))}
        {!visibleRequests.length && <div className="emptyState visitEmpty"><CalendarDays size={27} /><strong>{view === "upcoming" ? "No upcoming visits" : "No visit history yet"}</strong><p>{view === "upcoming" ? "Open the planner to choose your next care window." : "Completed and cancelled services will appear here."}</p></div>}
      </section>

      {editing && <section className="visitPlanner visitReschedule"><VisitForm vehicles={vehicles} initialRequest={editing} busy={busy} message={message} onSubmit={reschedule} onClose={() => { setEditing(null); setMessage(""); }} /></section>}
      {preview && <small className="previewLine workspacePreviewLine">Preview visit changes reset when the local session restarts.</small>}
    </div>
  );
}

function CarFrontFallback() {
  return <span className="actionNoticeIcon"><CalendarPlus size={21} /></span>;
}
