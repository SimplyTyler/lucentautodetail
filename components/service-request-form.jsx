"use client";

import { useState } from "react";
import { CalendarPlus, X } from "lucide-react";

export function ServiceRequestForm({ vehicles = [] }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const formElement = event.currentTarget;
    const response = await fetch("/api/service-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(formElement).entries()))
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "Visit could not be requested.");
      setBusy(false);
      return;
    }
    setMessage("Request received. Lucent will confirm the service window shortly.");
    setBusy(false);
    formElement.reset();
  }

  return (
    <div className="serviceRequest">
      <button className="button buttonLime" type="button" onClick={() => setOpen((value) => !value)}>
        {open ? <X size={17} /> : <CalendarPlus size={17} />}
        {open ? "Close request" : "Request a visit"}
      </button>
      {open && (
        <form onSubmit={submit}>
          <label><span>Vehicle</span><select name="vehicleId" required defaultValue=""><option value="" disabled>Select a vehicle</option>{vehicles.map((vehicle) => <option value={vehicle.id} key={vehicle.id}>{vehicle.year} {vehicle.make} {vehicle.model}</option>)}</select></label>
          <label><span>Preferred date</span><input name="preferredDate" type="date" required /></label>
          <label className="requestNotes"><span>Notes</span><textarea name="notes" rows="3" placeholder="Access details, priority areas, or timing notes" /></label>
          <button className="button buttonDark" type="submit" disabled={busy || !vehicles.length}>{busy ? "Sending..." : "Send request"}</button>
          {message && <p className={`formMessage ${message.startsWith("Request") ? "formMessageSuccess" : "formMessageError"}`} role="status">{message}</p>}
        </form>
      )}
    </div>
  );
}
