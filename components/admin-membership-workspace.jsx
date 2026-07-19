"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BadgeCheck, Check, CreditCard, Minus, Plus, RefreshCw, RotateCcw, Search, ShieldAlert, UserRound } from "lucide-react";
import { formatMoney, getPlan, membershipPlans } from "../lib/plans";

function dateLabel(value) {
  if (!value) return "Pending";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}

function MembershipEditor({ initialMembership, customer, vehicles, preview, onUpdated }) {
  const [membership, setMembership] = useState(initialMembership);
  const [planCode, setPlanCode] = useState(initialMembership.plan_code);
  const [vehicleCount, setVehicleCount] = useState(initialMembership.vehicle_count);
  const [coveredIds, setCoveredIds] = useState(initialMembership.covered_vehicle_ids || []);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const plan = getPlan(planCode) || membershipPlans[0];
  const currentPlan = getPlan(membership.plan_code) || plan;
  const coveredSet = useMemo(() => new Set(coveredIds), [coveredIds]);

  function choosePlan(nextPlan) {
    setPlanCode(nextPlan.code);
    setVehicleCount((count) => {
      const next = Math.min(nextPlan.maxVehicles, Math.max(nextPlan.minVehicles, count));
      setCoveredIds((items) => items.slice(0, next));
      return next;
    });
    setMessage("");
  }

  function changeCount(delta) {
    setVehicleCount((count) => {
      const next = Math.min(plan.maxVehicles, Math.max(plan.minVehicles, count + delta));
      setCoveredIds((items) => items.slice(0, next));
      return next;
    });
    setMessage("");
  }

  function toggleVehicle(id) {
    setCoveredIds((items) => items.includes(id) ? items.filter((item) => item !== id) : items.length < vehicleCount ? [...items, id] : items);
    setMessage("");
  }

  async function updateMembership(action) {
    setBusy(true);
    setMessage("");
    setError(false);
    try {
      const response = await fetch(`/api/admin/memberships/${membership.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, planCode, vehicleCount, vehicleIds: coveredIds }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Membership could not be updated.");
      const updated = { ...membership, ...data.membership, covered_vehicle_ids: data.coveredVehicleIds || coveredIds, customer_name: membership.customer_name, customer_email: membership.customer_email };
      setMembership(updated);
      setPlanCode(updated.plan_code);
      setVehicleCount(updated.vehicle_count);
      setCoveredIds(updated.covered_vehicle_ids);
      setConfirmCancel(false);
      setMessage(action === "cancel" ? "Cancellation scheduled for period end." : action === "resume" ? "Membership resumed." : action === "sync" ? "Membership synchronized with Stripe." : "Membership changes saved.");
      onUpdated(updated);
    } catch (updateError) {
      setError(true);
      setMessage(updateError.message);
    } finally {
      setBusy(false);
    }
  }

  const changing = planCode !== membership.plan_code || vehicleCount !== membership.vehicle_count || JSON.stringify([...coveredIds].sort()) !== JSON.stringify([...(membership.covered_vehicle_ids || [])].sort());

  return (
    <aside className="adminMembershipEditor">
      <div className="adminMembershipEditorHeader"><span className="adminCustomerAvatar adminCustomerAvatarLarge">{customer?.name?.slice(0, 1) || "M"}</span><div><span className="kicker">Membership control</span><h2>{membership.customer_name}</h2><p>{membership.customer_email}</p></div><span className={`statusPill status${membership.status}`}>{membership.status}</span></div>

      {membership.cancel_at_period_end && <div className="adminMembershipWarning"><ShieldAlert size={18} /><div><strong>Cancellation scheduled</strong><small>Care remains active through {dateLabel(membership.current_period_end)}.</small></div><button className="button buttonDark" type="button" disabled={busy} onClick={() => updateMembership("resume")}><RotateCcw size={15} /> Resume</button></div>}

      <div className="adminMembershipCurrent"><span><small>Current plan</small><strong>{currentPlan.name}</strong></span><span><small>Current monthly</small><strong>{formatMoney(currentPlan.price * membership.vehicle_count)}</strong></span><span><small>Billing date</small><strong>{dateLabel(membership.current_period_end)}</strong></span></div>

      <section className="adminMembershipSection"><div className="adminMembershipSectionHeading"><div><span className="kicker">Care level</span><h3>Plan and quantity</h3></div><button className="adminSyncButton" type="button" disabled={busy} onClick={() => updateMembership("sync")}><RefreshCw size={14} /> Sync Stripe</button></div>
        <div className="adminPlanSelector" role="radiogroup" aria-label="Membership plan">{membershipPlans.map((item) => <button className={`adminPlanSelect adminPlanSelect${item.accent} ${planCode === item.code ? "adminPlanSelectActive" : ""}`} type="button" role="radio" aria-checked={planCode === item.code} onClick={() => choosePlan(item)} key={item.code}><span>{item.audience}</span><strong>{item.name}</strong><small>{formatMoney(item.price)} / vehicle</small><i><Check size={14} /></i></button>)}</div>
        <div className="adminMembershipQuantity"><div><span>Care slots</span><small>{plan.minVehicles}-{plan.maxVehicles} available on {plan.name}</small></div><div className="stepper"><button className="iconButton" type="button" aria-label="Remove care slot" disabled={vehicleCount <= plan.minVehicles} onClick={() => changeCount(-1)}><Minus size={16} /></button><strong>{vehicleCount}</strong><button className="iconButton" type="button" aria-label="Add care slot" disabled={vehicleCount >= plan.maxVehicles} onClick={() => changeCount(1)}><Plus size={16} /></button></div><div><span>Updated monthly</span><strong>{formatMoney(plan.price * vehicleCount)}</strong></div></div>
      </section>

      <section className="adminMembershipSection"><div className="adminMembershipSectionHeading"><div><span className="kicker">Coverage</span><h3>Assigned vehicles</h3><p>Select up to {vehicleCount} vehicles from this customer account.</p></div><strong>{coveredIds.length} / {vehicleCount}</strong></div>
        <div className="adminMembershipVehicles">{vehicles.map((vehicle) => { const selected = coveredSet.has(vehicle.id); const disabled = !selected && coveredIds.length >= vehicleCount; return <label className={`coverageVehicle ${selected ? "coverageVehicleActive" : ""} ${disabled ? "coverageVehicleDisabled" : ""}`} key={vehicle.id}><input type="checkbox" checked={selected} disabled={disabled} onChange={() => toggleVehicle(vehicle.id)} /><span className="coverageVehicleIcon"><CreditCard size={18} /></span><span><strong>{vehicle.nickname || `${vehicle.year} ${vehicle.make}`}</strong><small>{vehicle.year} {vehicle.make} {vehicle.model}</small></span>{selected && <BadgeCheck size={18} />}</label>; })}{!vehicles.length && <p className="adminMutedCopy">No vehicles are available for assignment.</p>}</div>
      </section>

      <div className="adminMembershipSaveBar"><div><span>Pending configuration</span><strong>{plan.name} - {vehicleCount} slot{vehicleCount === 1 ? "" : "s"} - {formatMoney(plan.price * vehicleCount)}</strong>{changing && <small>Stripe will calculate any proration.</small>}</div><button className="button buttonDark" type="button" disabled={busy || !changing} onClick={() => updateMembership("update")}>{busy ? "Saving..." : "Save membership"}</button></div>
      {message && <p className={`workspaceMessage formMessage ${error ? "formMessageError" : "formMessageSuccess"}`} role="status">{message}</p>}

      <div className="adminMembershipDanger"><div><span className="kicker">Membership status</span><h3>{membership.cancel_at_period_end ? "Ends this period" : "Cancel at period end"}</h3><p>{membership.cancel_at_period_end ? "Resume before the billing period closes to keep service active." : "The customer keeps service through the current paid period."}</p></div>{!membership.cancel_at_period_end && !confirmCancel && <button className="textButtonDanger" type="button" onClick={() => setConfirmCancel(true)}>Schedule cancellation</button>}{confirmCancel && <div><button className="button buttonOutline" type="button" onClick={() => setConfirmCancel(false)}>Keep active</button><button className="button buttonDanger" type="button" disabled={busy} onClick={() => updateMembership("cancel")}>End after period</button></div>}</div>
      {preview && <small className="previewLine">Preview billing operations are simulated locally.</small>}
    </aside>
  );
}

export function AdminMembershipWorkspace({ initialMemberships, customers, vehicles, initialMembershipId, initialStatus, preview }) {
  const [memberships, setMemberships] = useState(initialMemberships);
  const [selectedId, setSelectedId] = useState(initialMembershipId || initialMemberships[0]?.id || null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState(initialStatus || "all");
  const selected = memberships.find((membership) => membership.id === selectedId) || memberships[0];
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return memberships.filter((membership) => {
      const matchesQuery = !needle || `${membership.customer_name} ${membership.customer_email} ${membership.plan_code}`.toLowerCase().includes(needle);
      const matchesStatus = status === "all" || (status === "cancelling" ? membership.cancel_at_period_end : membership.status === status);
      return matchesQuery && matchesStatus;
    });
  }, [memberships, query, status]);
  const selectedCustomer = customers.find((customer) => customer.id === selected?.user_id);
  const selectedVehicles = vehicles.filter((vehicle) => vehicle.user_id === selected?.user_id);
  const billable = memberships.filter((membership) => ["active", "trialing"].includes(membership.status));
  const monthly = billable.reduce((sum, membership) => sum + (getPlan(membership.plan_code)?.price || 0) * membership.vehicle_count, 0);

  function updateMembership(updated) {
    setMemberships((items) => items.map((item) => item.id === updated.id ? updated : item));
  }

  return (
    <div className="adminWorkspace">
      <header className="portalHeader adminCommandHeader"><div><span className="kicker">Subscription operations</span><h1>Memberships</h1><p>Control care plans, vehicle quantity, assignments, Stripe status, and cancellation.</p></div><Link className="button buttonOutline" href="/admin/customers?status=leads"><UserRound size={17} /> View membership leads</Link></header>
      <section className="adminWorkspaceStats" aria-label="Membership summary"><div><span>Active</span><strong>{memberships.filter((item) => item.status === "active").length}</strong></div><div><span>Trialing</span><strong>{memberships.filter((item) => item.status === "trialing").length}</strong></div><div><span>Past due</span><strong>{memberships.filter((item) => item.status === "past_due").length}</strong></div><div><span>Monthly run rate</span><strong>{formatMoney(monthly)}</strong></div></section>
      <section className="workspaceToolbar adminWorkspaceToolbar"><label className="workspaceSearch"><Search size={17} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customer or plan" aria-label="Search memberships" /></label><div className="segmentedControl" role="tablist" aria-label="Membership status">{[["all","All"],["active","Active"],["trialing","Trialing"],["past_due","Past due"],["cancelling","Cancelling"]].map(([value,label]) => <button type="button" role="tab" aria-selected={status === value} onClick={() => setStatus(value)} key={value}>{label}</button>)}</div></section>
      <div className="adminMembershipLayout"><section className="adminMembershipList"><div className="adminListMeta"><span>{visible.length} memberships</span><small>Select a subscription to manage it</small></div>{visible.map((membership) => { const plan = getPlan(membership.plan_code); return <button className={`adminMembershipRow ${selected?.id === membership.id ? "adminMembershipRowActive" : ""}`} type="button" onClick={() => setSelectedId(membership.id)} key={membership.id}><span className={`adminMembershipPlanMark adminMembershipPlanMark${plan?.accent || "lime"}`} /><span><strong>{membership.customer_name}</strong><small>{membership.customer_email}</small></span><span><strong>{plan?.name || membership.plan_code}</strong><small>{membership.vehicle_count} care slots</small></span><span><strong>{formatMoney((plan?.price || 0) * membership.vehicle_count)}</strong><small>per month</small></span><span className={`statusPill status${membership.status}`}>{membership.status}</span>{membership.cancel_at_period_end && <small className="adminCancelFlag">Cancelling</small>}</button>; })}{!visible.length && <div className="emptyState adminCompactEmpty"><CreditCard size={24} /><strong>No matching memberships</strong><p>Adjust the search or billing-status filter.</p></div>}</section>{selected && <MembershipEditor key={selected.id} initialMembership={selected} customer={selectedCustomer} vehicles={selectedVehicles} preview={preview} onUpdated={updateMembership} />}</div>
    </div>
  );
}
