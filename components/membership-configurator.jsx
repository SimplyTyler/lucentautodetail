"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Check, Minus, Plus, ShieldCheck } from "lucide-react";
import { formatMoney, membershipPlans } from "../lib/plans";

export function MembershipConfigurator({ initialPlan = "drive", compact = false }) {
  const [planCode, setPlanCode] = useState(initialPlan);
  const selectedPlan = membershipPlans.find((plan) => plan.code === planCode) || membershipPlans[0];
  const [vehicleCount, setVehicleCount] = useState(selectedPlan.minVehicles);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const total = useMemo(() => selectedPlan.price * vehicleCount, [selectedPlan, vehicleCount]);

  function selectPlan(plan) {
    setPlanCode(plan.code);
    setVehicleCount((count) => Math.min(plan.maxVehicles, Math.max(plan.minVehicles, count)));
    setMessage("");
  }

  async function startCheckout() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planCode: selectedPlan.code, vehicleCount })
      });
      const data = await response.json();
      if (response.status === 401) {
        window.location.assign(`/account?mode=signup&next=${encodeURIComponent(`/membership?plan=${selectedPlan.code}`)}`);
        return;
      }
      if (!response.ok) {
        throw new Error(data.error || "Checkout could not be started.");
      }
      window.location.assign(data.url);
    } catch (error) {
      setMessage(error.message);
      setBusy(false);
    }
  }

  return (
    <div className={`planBuilder ${compact ? "planBuilderCompact" : ""}`}>
      <div className="planChoices" role="radiogroup" aria-label="Membership plan">
        {membershipPlans.map((plan) => (
          <button
            className={`planChoice planAccent${plan.accent} ${plan.code === selectedPlan.code ? "planChoiceActive" : ""}`}
            type="button"
            role="radio"
            aria-checked={plan.code === selectedPlan.code}
            onClick={() => selectPlan(plan)}
            key={plan.code}
          >
            <span>{plan.audience}</span>
            <strong>{plan.name}</strong>
            <small>{formatMoney(plan.price)} / vehicle</small>
            <i aria-hidden="true"><Check size={15} /></i>
          </button>
        ))}
      </div>

      <div className="planSummary">
        <div className="planSummaryCopy">
          <span className="kicker">{selectedPlan.audience}</span>
          <h3>{selectedPlan.name} membership</h3>
          <p>{selectedPlan.description}</p>
          <ul className="checkList">
            {selectedPlan.features.map((feature) => (
              <li key={feature}><Check size={16} aria-hidden="true" /> {feature}</li>
            ))}
          </ul>
        </div>

        <div className="planCheckout">
          <span className="fieldLabel">Vehicles on plan</span>
          <div className="stepper" aria-label="Vehicle quantity">
            <button
              className="iconButton"
              type="button"
              title="Remove a vehicle"
              aria-label="Remove a vehicle"
              disabled={vehicleCount <= selectedPlan.minVehicles}
              onClick={() => setVehicleCount((count) => Math.max(selectedPlan.minVehicles, count - 1))}
            >
              <Minus size={17} />
            </button>
            <strong>{vehicleCount}</strong>
            <button
              className="iconButton"
              type="button"
              title="Add a vehicle"
              aria-label="Add a vehicle"
              disabled={vehicleCount >= selectedPlan.maxVehicles}
              onClick={() => setVehicleCount((count) => Math.min(selectedPlan.maxVehicles, count + 1))}
            >
              <Plus size={17} />
            </button>
          </div>
          <div className="priceTotal">
            <span>Monthly total</span>
            <strong>{formatMoney(total)}</strong>
            <small>{selectedPlan.visits}. Billed monthly.</small>
          </div>
          <button className="button buttonDark checkoutButton" type="button" disabled={busy} onClick={startCheckout}>
            {busy ? "Opening Stripe..." : "Continue to checkout"}
            {!busy && <ArrowRight size={18} aria-hidden="true" />}
          </button>
          <p className="secureNote"><ShieldCheck size={15} aria-hidden="true" /> Secure subscription billing by Stripe.</p>
          {message && <p className="formMessage formMessageError" role="alert">{message}</p>}
        </div>
      </div>
    </div>
  );
}
