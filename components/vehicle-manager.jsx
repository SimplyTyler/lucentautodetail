"use client";

import { useMemo, useState } from "react";
import { BadgeCheck, CarFront, Pencil, Plus, Search, ShieldCheck, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";

const filters = [
  ["all", "All vehicles"],
  ["daily", "Daily"],
  ["collector", "Collector"],
  ["business", "Business"]
];

const blankVehicle = {
  id: null,
  year: new Date().getFullYear(),
  make: "",
  model: "",
  nickname: "",
  color: "",
  vehicle_type: "daily",
  license_plate: "",
  plate_state: "AZ",
  vin_last_six: "",
  service_notes: ""
};

function vehicleSearchText(vehicle) {
  return [vehicle.year, vehicle.make, vehicle.model, vehicle.nickname, vehicle.color, vehicle.license_plate].filter(Boolean).join(" ").toLowerCase();
}

export function VehicleManager({ initialVehicles = [], coveredVehicleIds = [], preview = false }) {
  const router = useRouter();
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [editor, setEditor] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const covered = useMemo(() => new Set(coveredVehicleIds), [coveredVehicleIds]);

  const visibleVehicles = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return vehicles.filter((vehicle) => {
      const matchesType = filter === "all" || vehicle.vehicle_type === filter;
      return matchesType && (!needle || vehicleSearchText(vehicle).includes(needle));
    });
  }, [filter, query, vehicles]);

  function openEditor(vehicle = blankVehicle) {
    setEditor({ ...vehicle });
    setMessage("");
    setConfirmId(null);
  }

  async function saveVehicle(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    const editingId = editor?.id;

    try {
      const response = await fetch(editingId ? `/api/vehicles/${editingId}` : "/api/vehicles", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Vehicle could not be saved.");
      setVehicles((items) => editingId ? items.map((item) => item.id === editingId ? data.vehicle : item) : [...items, data.vehicle]);
      setEditor(null);
      if (!preview) router.refresh();
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
      const response = await fetch(`/api/vehicles/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Vehicle could not be removed.");
      setVehicles((items) => items.filter((vehicle) => vehicle.id !== id));
      setConfirmId(null);
      if (editor?.id === id) setEditor(null);
      if (!preview) router.refresh();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  const totals = {
    all: vehicles.length,
    daily: vehicles.filter((vehicle) => vehicle.vehicle_type === "daily").length,
    collector: vehicles.filter((vehicle) => vehicle.vehicle_type === "collector").length,
    business: vehicles.filter((vehicle) => vehicle.vehicle_type === "business").length
  };

  return (
    <div className="vehicleWorkspace">
      <header className="portalHeader portalSubpageHeader">
        <div><span className="kicker">Garage</span><h1>Your vehicles</h1><p>Keep every vehicle profile, care note, and membership assignment current.</p></div>
        <button className="button buttonLime" type="button" onClick={() => openEditor()}><Plus size={17} /> Add vehicle</button>
      </header>

      <section className="workspaceStats" aria-label="Garage summary">
        <div><span>Total vehicles</span><strong>{totals.all}</strong></div>
        <div><span>Daily drivers</span><strong>{totals.daily}</strong></div>
        <div><span>Collector</span><strong>{totals.collector}</strong></div>
        <div><span>Business</span><strong>{totals.business}</strong></div>
        <div><span>Covered</span><strong>{vehicles.filter((vehicle) => covered.has(vehicle.id)).length}</strong></div>
      </section>

      <section className="workspaceToolbar" aria-label="Vehicle filters">
        <label className="workspaceSearch"><Search size={17} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search vehicle, nickname, or plate" aria-label="Search vehicles" /></label>
        <div className="segmentedControl" role="tablist" aria-label="Vehicle type">
          {filters.map(([value, label]) => <button type="button" role="tab" aria-selected={filter === value} onClick={() => setFilter(value)} key={value}>{label}<span>{totals[value]}</span></button>)}
        </div>
      </section>

      {message && !editor && <p className="formMessage formMessageError workspaceMessage" role="alert">{message}</p>}

      <div className={`vehicleWorkspaceGrid ${editor ? "vehicleWorkspaceGridEditing" : ""}`}>
        <section className="vehicleCollection" aria-live="polite">
          {visibleVehicles.map((vehicle) => (
            <article className="vehicleCard" key={vehicle.id}>
              <div className="vehicleCardTop">
                <span className={`vehicleCardIcon vehicleCardIcon${vehicle.vehicle_type}`}><CarFront size={23} /></span>
                <div className="vehicleCardTitle"><span>{vehicle.nickname || vehicle.vehicle_type}</span><h2>{vehicle.year} {vehicle.make} {vehicle.model}</h2><small>{vehicle.color || "Color not recorded"}</small></div>
                <div className="vehicleCardActions">
                  <button className="iconButton" type="button" aria-label={`Edit ${vehicle.make} ${vehicle.model}`} title="Edit vehicle" onClick={() => openEditor(vehicle)}><Pencil size={16} /></button>
                  <button className="iconButton" type="button" aria-label={`Remove ${vehicle.make} ${vehicle.model}`} title="Remove vehicle" onClick={() => setConfirmId(vehicle.id)}><Trash2 size={16} /></button>
                </div>
              </div>

              <div className="vehicleFacts">
                <span><small>Plate</small><strong>{vehicle.license_plate ? `${vehicle.plate_state || ""} ${vehicle.license_plate}`.trim() : "Not added"}</strong></span>
                <span><small>VIN ending</small><strong>{vehicle.vin_last_six || "Not added"}</strong></span>
                <span><small>Care type</small><strong>{vehicle.vehicle_type}</strong></span>
              </div>

              <div className="vehicleCoverage">
                {covered.has(vehicle.id) ? <><BadgeCheck size={17} /><span><strong>On your membership</strong><small>Counts toward an active care slot</small></span></> : <><ShieldCheck size={17} /><span><strong>Not assigned</strong><small>Assign it from Membership</small></span></>}
              </div>
              {vehicle.service_notes && <p className="vehicleNotes">{vehicle.service_notes}</p>}

              {confirmId === vehicle.id && (
                <div className="confirmStrip" role="alert">
                  <span><strong>Remove this vehicle?</strong><small>Past visit records will remain on the account.</small></span>
                  <button className="button buttonOutline" type="button" onClick={() => setConfirmId(null)}>Keep it</button>
                  <button className="button buttonDanger" type="button" disabled={busy} onClick={() => removeVehicle(vehicle.id)}>{busy ? "Removing..." : "Remove"}</button>
                </div>
              )}
            </article>
          ))}
          {!visibleVehicles.length && <div className="emptyState vehicleEmpty"><CarFront size={26} /><strong>{vehicles.length ? "No matching vehicles" : "Your garage is empty"}</strong><p>{vehicles.length ? "Adjust the search or vehicle type filter." : "Add the first vehicle you want Lucent to maintain."}</p></div>}
        </section>

        {editor && (
          <aside className="vehicleEditor" aria-label={editor.id ? "Edit vehicle" : "Add vehicle"}>
            <div className="vehicleEditorHeading"><div><span className="kicker">{editor.id ? "Vehicle profile" : "New vehicle"}</span><h2>{editor.id ? `Edit ${editor.nickname || editor.model}` : "Add to your garage"}</h2></div><button className="iconButton" type="button" aria-label="Close vehicle editor" title="Close" onClick={() => setEditor(null)}><X size={18} /></button></div>
            <form className="vehicleEditorForm" onSubmit={saveVehicle} key={editor.id || "new"}>
              <label className="shortField"><span>Year</span><input name="year" type="number" min="1900" max="2100" defaultValue={editor.year} required /></label>
              <label><span>Make</span><input name="make" type="text" defaultValue={editor.make || ""} placeholder="Porsche" required /></label>
              <label><span>Model</span><input name="model" type="text" defaultValue={editor.model || ""} placeholder="911 GT3" required /></label>
              <label><span>Nickname</span><input name="nickname" type="text" defaultValue={editor.nickname || ""} placeholder="Weekend car" /></label>
              <label><span>Color</span><input name="color" type="text" defaultValue={editor.color || ""} placeholder="Agate grey" /></label>
              <label><span>Use</span><select name="vehicleType" defaultValue={editor.vehicle_type || "daily"}><option value="daily">Daily driver</option><option value="collector">Collector</option><option value="business">Business</option></select></label>
              <label><span>License plate</span><input name="licensePlate" type="text" defaultValue={editor.license_plate || ""} placeholder="LUCENT1" /></label>
              <label className="shortField"><span>State</span><input name="plateState" type="text" defaultValue={editor.plate_state || ""} maxLength={3} placeholder="AZ" /></label>
              <label><span>VIN last six</span><input name="vinLastSix" type="text" defaultValue={editor.vin_last_six || ""} maxLength={6} placeholder="1842GT" /></label>
              <label className="formSpan"><span>Care notes</span><textarea name="serviceNotes" rows="4" defaultValue={editor.service_notes || ""} placeholder="Coating, access, finish, or cabin notes" /></label>
              <div className="formActions formSpan"><button className="button buttonOutline" type="button" onClick={() => setEditor(null)}>Cancel</button><button className="button buttonDark" type="submit" disabled={busy}>{busy ? "Saving..." : editor.id ? "Save changes" : "Add vehicle"}</button></div>
              {message && <p className="formMessage formMessageError formSpan" role="alert">{message}</p>}
            </form>
            {preview && <small className="previewLine">Preview edits reset when the local session restarts.</small>}
          </aside>
        )}
      </div>
    </div>
  );
}
