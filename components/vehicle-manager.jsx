"use client";

import { useState } from "react";
import { CarFront, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";

export function VehicleManager({ initialVehicles = [], preview = false }) {
  const router = useRouter();
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function addVehicle(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const response = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form.entries()))
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Vehicle could not be added.");
      setVehicles((items) => [...items, data.vehicle]);
      formElement.reset();
      setOpen(false);
      if (!preview) router.refresh();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeVehicle(id) {
    const response = await fetch(`/api/vehicles/${id}`, { method: "DELETE" });
    if (response.ok) {
      setVehicles((items) => items.filter((vehicle) => vehicle.id !== id));
      if (!preview) router.refresh();
    }
  }

  return (
    <div className="vehicleManager">
      <div className="panelHeading">
        <div><span className="kicker">Garage</span><h2>Your vehicles</h2></div>
        <button className="button buttonOutline" type="button" onClick={() => setOpen((value) => !value)}>
          {open ? <X size={17} aria-hidden="true" /> : <Plus size={17} aria-hidden="true" />}
          {open ? "Close" : "Add vehicle"}
        </button>
      </div>

      {open && (
        <form className="vehicleForm" onSubmit={addVehicle}>
          <label><span>Year</span><input name="year" type="number" min="1900" max="2100" placeholder="2024" required /></label>
          <label><span>Make</span><input name="make" type="text" placeholder="Porsche" required /></label>
          <label><span>Model</span><input name="model" type="text" placeholder="911 GT3" required /></label>
          <label><span>Nickname</span><input name="nickname" type="text" placeholder="Weekend car" /></label>
          <label><span>Color</span><input name="color" type="text" placeholder="Graphite" /></label>
          <label><span>Use</span><select name="vehicleType" defaultValue="daily"><option value="daily">Daily driver</option><option value="collector">Collector</option><option value="business">Business</option></select></label>
          <button className="button buttonDark" type="submit" disabled={busy}>{busy ? "Adding..." : "Save vehicle"}</button>
          {message && <p className="formMessage formMessageError" role="alert">{message}</p>}
        </form>
      )}

      <div className="vehicleList">
        {vehicles.map((vehicle) => (
          <div className="vehicleRow" key={vehicle.id}>
            <span className="vehicleIcon"><CarFront size={21} aria-hidden="true" /></span>
            <div><strong>{vehicle.year} {vehicle.make} {vehicle.model}</strong><small>{vehicle.nickname || vehicle.vehicle_type || "Member vehicle"}{vehicle.color ? ` · ${vehicle.color}` : ""}</small></div>
            <span className="statusPill statusNeutral">{vehicle.vehicle_type || "daily"}</span>
            <button className="iconButton" type="button" aria-label={`Remove ${vehicle.make} ${vehicle.model}`} title="Remove vehicle" onClick={() => removeVehicle(vehicle.id)}>
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {!vehicles.length && <div className="emptyState"><CarFront size={24} /><strong>No vehicles yet</strong><p>Add the first vehicle you want Lucent to care for.</p></div>}
      </div>
      {preview && <small className="previewLine">Preview changes last for this browser session only.</small>}
    </div>
  );
}
