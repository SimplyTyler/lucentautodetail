"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";

export function BillingButton({ preview = false }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function openPortal() {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/billing/portal", { method: "POST" });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "Billing portal is unavailable.");
      setBusy(false);
      return;
    }
    window.location.assign(data.url);
  }

  return (
    <>
      <button className="button buttonOutline" type="button" disabled={busy || preview} title={preview ? "Stripe billing is unavailable in local preview" : undefined} onClick={openPortal}>
        {busy ? "Opening..." : preview ? "Billing preview" : "Manage billing"} {!busy && <ExternalLink size={16} aria-hidden="true" />}
      </button>
      {message && <p className="formMessage formMessageError" role="alert">{message}</p>}
    </>
  );
}
