"use client";

import { useMemo, useState } from "react";
import { BadgeCheck, Check, CreditCard, Minus, Plus, RotateCcw, ShieldCheck, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { BillingButton } from "./billing-button";
import { MembershipConfigurator } from "./membership-configurator";
import { formatMoney, getPlan, membershipPlans } from "../lib/plans";

function dateLabel(value) {
  if (!value) return "Pending";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}

export function MembershipManager({ initialMembership, vehicles = [], initialCoveredVehicleIds = [], preview = false }) {
  const router = useRouter();
  const [membership, setMembership] = useState(initialMembership);
  const [planCode, setPlanCode] = useState(initialMembership?.plan_code || "drive");
  const initialPlan = getPlan(initialMembership?.plan_code) || membershipPlans[0];
  const [vehicleCount, setVehicleCount] = useState(initialMembership?.vehicle_count || initialPlan.minVehicles);
  const [coveredIds, setCoveredIds] = useState(initialCoveredVehicleIds);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const selectedPlan = getPlan(planCode) || membershipPlans[0];
  const total = selectedPlan.price * vehicleCount;
  const coveredSet = useMemo(() => new Set(coveredIds), [coveredIds]);

  if (!membership) {
    return (
      <div className="membershipWorkspace">
        <header className="portalHeader portalSubpageHeader"><div><span className="kicker">Membership</span><h1>Build your care plan</h1><p>Choose the right service level and number of vehicles, then continue through Stripe.</p></div></header>
        <div className="membershipStart"><MembershipConfigurator initialPlan="drive" /></div>
      </div>
    );
  }

  function choosePlan(plan) {
    setPlanCode(plan.code);
    setVehicleCount((count) => {
      const nextCount = Math.min(plan.maxVehicles, Math.max(plan.minVehicles, count));
      setCoveredIds((items) => items.slice(0, nextCount));
      return nextCount;
    });
    setMessage("");
  }

  function changeCount(delta) {
    setVehicleCount((count) => {
      const nextCount = Math.min(selectedPlan.maxVehicles, Math.max(selectedPlan.minVehicles, count + delta));
      setCoveredIds((items) => items.slice(0, nextCount));
      return nextCount;
    });
    setMessage("");
  }

  function toggleVehicle(id) {
    setCoveredIds((items) => {
      if (items.includes(id)) return items.filter((item) => item !== id);
      if (items.length >= vehicleCount) return items;
      return [...items, id];
    });
    setMessage("");
  }

  async function updateMembership(action = "update") {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/membership", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, planCode, vehicleCount, vehicleIds: coveredIds })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Membership changes could not be saved.");
      setMembership(data.membership);
      if (data.coveredVehicleIds) setCoveredIds(data.coveredVehicleIds);
      setConfirmCancel(false);
      setMessage(action === "cancel" ? "Cancellation scheduled for the end of this billing period." : action === "resume" ? "Membership renewed. Future billing will continue." : "Membership changes saved. Stripe will apply any proration to your next invoice.");
      if (!preview) router.refresh();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  const currentPlan = getPlan(membership.plan_code) || selectedPlan;
  const changingPlan = membership.plan_code !== selectedPlan.code;
  const changingCount = membership.vehicle_count !== vehicleCount;

  return (
    <div className="membershipWorkspace">
      <header className="portalHeader portalSubpageHeader">
        <div><span className="kicker">Membership</span><h1>Manage your care</h1><p>Change the plan, care slots, covered vehicles, and billing from one place.</p></div>
        <span className={`statusPill status${membership.status}`}>{membership.status}</span>
      </header>

      {membership.cancel_at_period_end && <div className="membershipAlert"><TriangleAlert size={19} /><div><strong>Your membership is scheduled to end.</strong><p>Care remains active through {dateLabel(membership.current_period_end)}.</p></div><button className="button buttonDark" type="button" disabled={busy} onClick={() => updateMembership("resume")}><RotateCcw size={16} /> Resume membership</button></div>}

      <section className="membershipCurrentBand">
        <div><span>Current plan</span><strong>{currentPlan.name}</strong><small>{currentPlan.audience}</small></div>
        <div><span>Care slots</span><strong>{membership.vehicle_count}</strong><small>{coveredIds.length} assigned</small></div>
        <div><span>Current monthly</span><strong>{formatMoney(currentPlan.price * membership.vehicle_count)}</strong><small>Before tax or credits</small></div>
        <div><span>Billing period</span><strong>{dateLabel(membership.current_period_end)}</strong><small>{membership.cancel_at_period_end ? "Final service period" : "Renews automatically"}</small></div>
      </section>

      <section className="membershipEditor">
        <div className="membershipEditorMain">
          <div className="membershipSectionHeading"><span className="kicker">Care level</span><h2>Choose a membership</h2><p>Plan changes are prorated by Stripe against the current billing period.</p></div>
          <div className="membershipPlanGrid" role="radiogroup" aria-label="Membership plan">
            {membershipPlans.map((plan) => (
              <button className={`membershipPlanOption membershipPlan${plan.accent} ${plan.code === selectedPlan.code ? "membershipPlanOptionActive" : ""}`} type="button" role="radio" aria-checked={plan.code === selectedPlan.code} onClick={() => choosePlan(plan)} key={plan.code}>
                <span>{plan.audience}</span><strong>{plan.name}</strong><small>{formatMoney(plan.price)} / vehicle</small><i><Check size={15} /></i>
              </button>
            ))}
          </div>

          <div className="membershipPlanDetail">
            <div><span className="kicker">{selectedPlan.name} care</span><h2>{selectedPlan.description}</h2></div>
            <ul>{selectedPlan.features.map((feature) => <li key={feature}><Check size={16} /> {feature}</li>)}</ul>
          </div>

          <div className="coverageHeading"><div><span className="kicker">Vehicle coverage</span><h2>Assign care slots</h2><p>Select up to {vehicleCount} vehicle{vehicleCount === 1 ? "" : "s"}. Empty slots can be assigned later.</p></div><strong>{coveredIds.length} / {vehicleCount}</strong></div>
          <div className="coverageVehicleList">
            {vehicles.map((vehicle) => {
              const selected = coveredSet.has(vehicle.id);
              const disabled = !selected && coveredIds.length >= vehicleCount;
              return (
                <label className={`coverageVehicle ${selected ? "coverageVehicleActive" : ""} ${disabled ? "coverageVehicleDisabled" : ""}`} key={vehicle.id}>
                  <input type="checkbox" checked={selected} disabled={disabled} onChange={() => toggleVehicle(vehicle.id)} />
                  <span className="coverageVehicleIcon"><ShieldCheck size={19} /></span>
                  <span><strong>{vehicle.nickname || `${vehicle.year} ${vehicle.make}`}</strong><small>{vehicle.year} {vehicle.make} {vehicle.model}</small></span>
                  {selected && <BadgeCheck size={19} />}
                </label>
              );
            })}
            {!vehicles.length && <div className="emptyState compactEmpty"><ShieldCheck size={25} /><strong>No vehicles to assign</strong><p>Add vehicles in your garage, then return to assign care slots.</p></div>}
          </div>
        </div>

        <aside className="membershipCheckoutPanel">
          <span className="kicker">Updated membership</span>
          <h2>{selectedPlan.name}</h2>
          <div className="membershipStepperLabel"><span>Vehicles on plan</span><small>{selectedPlan.minVehicles}-{selectedPlan.maxVehicles} allowed</small></div>
          <div className="stepper membershipStepper">
            <button className="iconButton" type="button" aria-label="Remove a care slot" title="Remove a care slot" disabled={vehicleCount <= selectedPlan.minVehicles} onClick={() => changeCount(-1)}><Minus size={17} /></button>
            <strong>{vehicleCount}</strong>
            <button className="iconButton" type="button" aria-label="Add a care slot" title="Add a care slot" disabled={vehicleCount >= selectedPlan.maxVehicles} onClick={() => changeCount(1)}><Plus size={17} /></button>
          </div>
          <div className="membershipUpdatedTotal"><span>New monthly total</span><strong>{formatMoney(total)}</strong><small>{selectedPlan.visits}</small></div>
          {(changingPlan || changingCount) && <div className="changeSummary"><span>{changingPlan ? `${currentPlan.name} to ${selectedPlan.name}` : `${membership.vehicle_count} to ${vehicleCount} care slots`}</span><small>Stripe calculates the exact proration.</small></div>}
          <button className="button buttonDark" type="button" disabled={busy} onClick={() => updateMembership("update")}>{busy ? "Saving..." : "Save membership changes"}</button>
          <p className="secureNote"><ShieldCheck size={15} /> Subscription updates are secured by Stripe.</p>
          {message && <p className={`formMessage ${message.includes("saved") || message.includes("scheduled") || message.includes("renewed") ? "formMessageSuccess" : "formMessageError"}`} role="status">{message}</p>}
        </aside>
      </section>

      <section className="billingManagement">
        <div><span className="billingManagementIcon"><CreditCard size={21} /></span><div><span className="kicker">Billing</span><h2>Payment methods and invoices</h2><p>Stripe securely manages cards, invoice history, tax details, and billing contacts.</p></div></div>
        <BillingButton preview={preview} />
      </section>

      <section className="membershipDangerZone">
        <div><span className="kicker">Membership status</span><h2>{membership.cancel_at_period_end ? "Cancellation scheduled" : "Cancel at period end"}</h2><p>{membership.cancel_at_period_end ? "Resume before the period closes to keep uninterrupted care." : `Your plan remains active through ${dateLabel(membership.current_period_end)}. No future renewal will be charged.`}</p></div>
        {!membership.cancel_at_period_end && !confirmCancel && <button className="textButtonDanger" type="button" onClick={() => setConfirmCancel(true)}>Cancel membership</button>}
        {confirmCancel && <div className="dangerConfirm"><button className="button buttonOutline" type="button" onClick={() => setConfirmCancel(false)}>Keep membership</button><button className="button buttonDanger" type="button" disabled={busy} onClick={() => updateMembership("cancel")}>{busy ? "Scheduling..." : "End after this period"}</button></div>}
      </section>
    </div>
  );
}
