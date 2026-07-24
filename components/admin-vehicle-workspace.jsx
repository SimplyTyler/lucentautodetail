"use client";

import { useMemo, useState } from "react";
import { BadgeCheck, CarFront, Pencil, Plus, Search, Trash2, UserRound, X } from "lucide-react";

const blankVehicle = { id: null, user_id: "", year: new Date().getFullYear(), make: "", model: "", nickname: "", color: "", vehicle_type: "daily", license_plate: "", plate_state: "AZ", vin_last_six: "", service_notes: "" };

export function AdminVehicleWorkspace({ initialVehicles, customers, initialCustomerId, initialVehicleId, openNew, preview }) {
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [customerId, setCustomerId] = useState(initialCustomerId || "all");
  const initialEditor = openNew ? { ...blankVehicle, user_id: initialCustomerId || customers[0]?.id || "" } : initialVehicles.find((vehicle) => vehicle.id === initialVehicleId) || null;
  const [editor, setEditor] = useState(initialEditor);
  const [confirmId, setConfirmId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return vehicles.filter((vehicle) => {
      const matchesQuery = !needle || `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.nickname || ""} ${vehicle.license_plate || ""} ${vehicle.customer_name}`.toLowerCase().includes(needle);
      return matchesQuery && (type === "all" || vehicle.vehicle_type === type) && (customerId === "all" || vehicle.user_id === customerId);
    });
  }, [customerId, query, type, vehicles]);

  function openEditor(vehicle = null) {
    setEditor(vehicle ? { ...vehicle } : { ...blankVehicle, user_id: customerId !== "all" ? customerId : customers[0]?.id || "" });
    setConfirmId(null);
    setMessage("");
  }

  async function saveVehicle(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    const editingId = editor?.id;
    try {
      const response = await fetch(editingId ? `/api/admin/vehicles/${editingId}` : "/api/admin/vehicles", { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Vehicle could not be saved.");
      const owner = customers.find((customer) => customer.id === (editingId ? editor.user_id : payload.userId));
      const saved = { ...editor, ...data.vehicle, user_id: editingId ? editor.user_id : payload.userId, customer_name: data.vehicle.customer_name || owner?.name, customer_email: data.vehicle.customer_email || owner?.email, covered: editingId ? editor.covered : false };
      setVehicles((items) => editingId ? items.map((item) => item.id === editingId ? saved : item) : [...items, saved]);
      setEditor(null);
      setMessage(editingId ? "Vehicle profile updated." : "Vehicle added to the customer account.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeVehicle(id) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/vehicles/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Vehicle could not be removed.");
      setVehicles((items) => items.filter((vehicle) => vehicle.id !== id));
      setConfirmId(null);
      if (editor?.id === id) setEditor(null);
      setMessage("Vehicle removed from the account.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="adminWorkspace">
      <header className="portalHeader adminCommandHeader"><div><span className="kicker">Fleet registry</span><h1>Vehicles</h1><p>Add vehicles to customers, maintain service profiles, and monitor membership coverage.</p></div><button className="button buttonLime" type="button" onClick={() => openEditor()}><Plus size={17} /> Add vehicle</button></header>
      <section className="adminWorkspaceStats" aria-label="Vehicle summary"><div><span>Total vehicles</span><strong>{vehicles.length}</strong></div><div><span>Covered</span><strong>{vehicles.filter((vehicle) => vehicle.covered).length}</strong></div><div><span>Collector</span><strong>{vehicles.filter((vehicle) => vehicle.vehicle_type === "collector").length}</strong></div><div><span>Business</span><strong>{vehicles.filter((vehicle) => vehicle.vehicle_type === "business").length}</strong></div></section>
      <section className="workspaceToolbar adminWorkspaceToolbar"><label className="workspaceSearch"><Search size={17} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search vehicle, plate, or customer" aria-label="Search vehicle registry" /></label><div className="adminToolbarSelects"><select value={customerId} onChange={(event) => setCustomerId(event.target.value)} aria-label="Filter vehicles by customer"><option value="all">All customers</option>{customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.name}</option>)}</select><select value={type} onChange={(event) => setType(event.target.value)} aria-label="Filter vehicles by type"><option value="all">All vehicle types</option><option value="daily">Daily</option><option value="collector">Collector</option><option value="business">Business</option></select></div></section>
      {message && !editor && <p className={`workspaceMessage formMessage ${message.includes("updated") || message.includes("added") || message.includes("removed") ? "formMessageSuccess" : "formMessageError"}`} role="status">{message}</p>}

      <div className={`adminVehicleGrid ${editor ? "adminVehicleGridEditing" : ""}`}>
        <section className="adminVehicleRegistry">
          {visible.map((vehicle) => <article className="adminVehicleCard" key={vehicle.id}>
            <div className="adminVehicleCardHeader"><span className={`vehicleCardIcon vehicleCardIcon${vehicle.vehicle_type}`}><CarFront size={22} /></span><div><span>{vehicle.nickname || vehicle.vehicle_type}</span><h2>{vehicle.year} {vehicle.make} {vehicle.model}</h2><small><UserRound size={13} /> {vehicle.customer_name}</small></div><div><button className="iconButton" type="button" aria-label={`Edit ${vehicle.make} ${vehicle.model}`} title="Edit vehicle" onClick={() => openEditor(vehicle)}><Pencil size={16} /></button><button className="iconButton" type="button" aria-label={`Remove ${vehicle.make} ${vehicle.model}`} title="Remove vehicle" onClick={() => setConfirmId(vehicle.id)}><Trash2 size={16} /></button></div></div>
            <div className="adminVehicleFacts"><span><small>Plate</small><strong>{vehicle.license_plate ? `${vehicle.plate_state || ""} ${vehicle.license_plate}`.trim() : "Not added"}</strong></span><span><small>VIN ending</small><strong>{vehicle.vin_last_six || "Not added"}</strong></span><span><small>Color</small><strong>{vehicle.color || "Not recorded"}</strong></span></div>
            <div className={`adminCoverageLine ${vehicle.covered ? "adminCoverageLineActive" : ""}`}>{vehicle.covered ? <BadgeCheck size={16} /> : <CarFront size={16} />}<span><strong>{vehicle.covered ? "Assigned to membership" : "Not assigned"}</strong><small>{vehicle.covered ? "Counts toward an active care slot" : "Assign from Memberships"}</small></span></div>
            {vehicle.service_notes && <p className="vehicleNotes">{vehicle.service_notes}</p>}
            {confirmId === vehicle.id && <div className="confirmStrip"><span><strong>Remove this vehicle?</strong><small>Past appointment records will remain.</small></span><button className="button buttonOutline" type="button" onClick={() => setConfirmId(null)}>Keep</button><button className="button buttonDanger" type="button" disabled={busy} onClick={() => removeVehicle(vehicle.id)}>{busy ? "Removing..." : "Remove"}</button></div>}
          </article>)}
          {!visible.length && <div className="emptyState adminRegistryEmpty"><CarFront size={26} /><strong>No matching vehicles</strong><p>Adjust the registry filters or add a vehicle.</p></div>}
        </section>

        {editor && <aside className="adminEditorPanel"><div className="adminEditorHeading"><div><span className="kicker">{editor.id ? "Vehicle profile" : "New vehicle"}</span><h2>{editor.id ? `Edit ${editor.nickname || editor.model}` : "Add to a customer"}</h2></div><button className="iconButton" type="button" aria-label="Close vehicle editor" onClick={() => setEditor(null)}><X size={18} /></button></div>
          <form className="adminEditorForm" onSubmit={saveVehicle} key={editor.id || "new"}>
            {editor.id ? <div className="adminLockedField formSpan"><UserRound size={16} /><span><small>Customer</small><strong>{editor.customer_name}</strong></span></div> : <label className="formSpan"><span>Customer</span><select name="userId" defaultValue={editor.user_id} required><option value="" disabled>Select customer</option>{customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.name}</option>)}</select></label>}
            <label><span>Year</span><input name="year" type="number" min="1900" max="2100" defaultValue={editor.year} required /></label><label><span>Make</span><input name="make" defaultValue={editor.make || ""} required /></label><label><span>Model</span><input name="model" defaultValue={editor.model || ""} required /></label><label><span>Nickname</span><input name="nickname" defaultValue={editor.nickname || ""} /></label><label><span>Color</span><input name="color" defaultValue={editor.color || ""} /></label><label><span>Use</span><select name="vehicleType" defaultValue={editor.vehicle_type || "daily"}><option value="daily">Daily driver</option><option value="collector">Collector</option><option value="business">Business</option></select></label><label><span>License plate</span><input name="licensePlate" defaultValue={editor.license_plate || ""} /></label><label><span>State</span><input name="plateState" maxLength="3" defaultValue={editor.plate_state || ""} /></label><label><span>VIN last six</span><input name="vinLastSix" maxLength="6" defaultValue={editor.vin_last_six || ""} /></label><label className="formSpan"><span>Service notes</span><textarea name="serviceNotes" rows="4" defaultValue={editor.service_notes || ""} /></label>
            <div className="formActions formSpan"><button className="button buttonOutline" type="button" onClick={() => setEditor(null)}>Cancel</button><button className="button buttonDark" type="submit" disabled={busy}>{busy ? "Saving..." : editor.id ? "Save vehicle" : "Add vehicle"}</button></div>{message && <p className="formMessage formMessageError formSpan">{message}</p>}
          </form>{preview && <small className="previewLine">Preview vehicle edits reset when the local server restarts.</small>}</aside>}
      </div>
    </div>
  );
}
