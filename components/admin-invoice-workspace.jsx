"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
  CircleDollarSign,
  Download,
  FileText,
  Mail,
  Plus,
  ReceiptText,
  Search,
  Send,
  Trash2,
  UserRound,
  X
} from "lucide-react";

const terms = [7, 14, 30, 45];
const statuses = [
  ["all", "All"],
  ["draft", "Drafts"],
  ["open", "Open"],
  ["overdue", "Overdue"],
  ["paid", "Paid"],
  ["void", "Void"]
];

function money(value, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 2
  }).format((value || 0) / 100);
}

function dateLabel(seconds) {
  if (!seconds) return "Not set";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Phoenix"
  }).format(new Date(seconds * 1000));
}

function isOverdue(invoice) {
  if (invoice.status !== "open" || !invoice.due_date) return false;
  const due = new Date(invoice.due_date * 1000);
  due.setHours(23, 59, 59, 999);
  return due.getTime() < Date.now();
}

function displayStatus(invoice) {
  return isOverdue(invoice) ? "overdue" : invoice.status || "draft";
}

function freshDraft(customerId = "", vehicleId = "") {
  return {
    userId: customerId,
    vehicleId,
    reference: "",
    dueDays: "14",
    memo: "",
    footer: "Thank you for trusting Lucent Auto Detail with your vehicles.",
    lineItems: [{ id: "line-1", description: "", quantity: "1", rate: "" }]
  };
}

export function AdminInvoiceWorkspace({
  initialInvoices,
  customers,
  vehicles,
  initialInvoiceId,
  initialCustomerId,
  initialVehicleId,
  initialFilter,
  startNew,
  preview,
  configured,
  loadError
}) {
  const nextLineId = useRef(2);
  const [invoices, setInvoices] = useState(initialInvoices);
  const [selectedId, setSelectedId] = useState(initialInvoiceId || initialInvoices[0]?.id || null);
  const [filter, setFilter] = useState(statuses.some(([value]) => value === initialFilter) ? initialFilter : "all");
  const [query, setQuery] = useState("");
  const [editorOpen, setEditorOpen] = useState(Boolean(startNew || initialCustomerId));
  const [draft, setDraft] = useState(() => freshDraft(initialCustomerId || customers[0]?.id || "", initialVehicleId || ""));
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState("");
  const selected = invoices.find((invoice) => invoice.id === selectedId) || invoices[0] || null;
  const canInvoice = preview || configured;

  const metrics = useMemo(() => {
    const paidSince = Math.floor((Date.now() - 30 * 86400000) / 1000);
    return {
      outstanding: invoices.filter((invoice) => invoice.status === "open").reduce((sum, invoice) => sum + invoice.amount_remaining, 0),
      overdue: invoices.filter(isOverdue).length,
      drafts: invoices.filter((invoice) => invoice.status === "draft").length,
      paidLast30: invoices.filter((invoice) => invoice.status === "paid" && (invoice.paid_at || invoice.created) >= paidSince).reduce((sum, invoice) => sum + invoice.amount_paid, 0)
    };
  }, [invoices]);

  const visibleInvoices = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return invoices.filter((invoice) => {
      const status = displayStatus(invoice);
      const matchesFilter = filter === "all" || status === filter || (filter === "open" && status === "overdue");
      const matchesQuery = !needle || `${invoice.number || "draft"} ${invoice.customer_name} ${invoice.customer_email || ""} ${invoice.vehicle_label || ""} ${invoice.description || ""}`.toLowerCase().includes(needle);
      return matchesFilter && matchesQuery;
    });
  }, [filter, invoices, query]);

  const selectedCustomer = customers.find((customer) => customer.id === draft.userId);
  const availableVehicles = vehicles.filter((vehicle) => vehicle.user_id === draft.userId);
  const invoiceTotal = draft.lineItems.reduce((sum, item) => sum + (Number(item.quantity) || 0) * Math.round((Number(item.rate) || 0) * 100), 0);

  function openEditor(customerId = "", vehicleId = "") {
    const userId = customerId || initialCustomerId || customers[0]?.id || "";
    setDraft(freshDraft(userId, vehicleId));
    setEditorOpen(true);
    setMessage("");
    setConfirmAction("");
  }

  function updateLine(id, key, value) {
    setDraft((current) => ({
      ...current,
      lineItems: current.lineItems.map((item) => item.id === id ? { ...item, [key]: value } : item)
    }));
  }

  function addLine() {
    const id = `line-${nextLineId.current++}`;
    setDraft((current) => ({
      ...current,
      lineItems: [...current.lineItems, { id, description: "", quantity: "1", rate: "" }]
    }));
  }

  function removeLine(id) {
    setDraft((current) => ({
      ...current,
      lineItems: current.lineItems.length === 1 ? current.lineItems : current.lineItems.filter((item) => item.id !== id)
    }));
  }

  async function createInvoice(action) {
    if (!selectedCustomer) {
      setMessage("Choose a customer before creating an invoice.");
      return;
    }
    setBusy(action);
    setMessage("");
    const vehicle = vehicles.find((item) => item.id === draft.vehicleId);
    try {
      const response = await fetch("/api/admin/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          action,
          customerName: selectedCustomer.name,
          customerEmail: selectedCustomer.email,
          vehicleYear: vehicle?.year,
          vehicleMake: vehicle?.make,
          vehicleModel: vehicle?.model,
          vehicleNickname: vehicle?.nickname,
          lineItems: draft.lineItems.map((item) => ({
            description: item.description,
            quantity: Number(item.quantity),
            unitAmount: Math.round(Number(item.rate) * 100)
          }))
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Invoice could not be created.");
      setInvoices((items) => [data.invoice, ...items]);
      setSelectedId(data.invoice.id);
      setEditorOpen(false);
      setMessage(preview
        ? (action === "send" ? "Preview invoice created in sent state." : "Preview draft invoice saved.")
        : (action === "send" ? "Invoice created and sent to the customer." : "Draft invoice saved in Stripe."));
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy("");
    }
  }

  async function runInvoiceAction(action) {
    if (!selected) return;
    setBusy(action);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/invoices/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, number: selected.number })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Invoice action failed.");
      if (data.deleted) {
        const remaining = invoices.filter((invoice) => invoice.id !== selected.id);
        setInvoices(remaining);
        setSelectedId(remaining[0]?.id || null);
        setMessage("Draft invoice deleted.");
      } else {
        setInvoices((items) => items.map((invoice) => invoice.id === selected.id ? { ...invoice, ...data.invoice } : invoice));
        setMessage(action === "void" ? "Invoice voided in Stripe." : "Invoice email sent.");
      }
      setConfirmAction("");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy("");
    }
  }

  function selectInvoice(id) {
    setSelectedId(id);
    setConfirmAction("");
    setMessage("");
  }

  return (
    <div className="adminWorkspace">
      <header className="portalHeader adminCommandHeader">
        <div>
          <span className="kicker">Billing operations</span>
          <h1>Invoices</h1>
          <p>Create itemized invoices, send Stripe payment pages, and keep receivables moving.</p>
        </div>
        <button className="button buttonLime" type="button" disabled={!canInvoice} onClick={() => openEditor()}>
          <Plus size={17} /> New invoice
        </button>
      </header>

      {!canInvoice && (
        <div className="adminStripeNotice" role="status">
          <CircleDollarSign size={19} />
          <div><strong>Connect Stripe to start invoicing.</strong><span>Add your Stripe secret key and webhook secret in Render. Customer records and the CRM remain available.</span></div>
        </div>
      )}
      {loadError && (
        <div className="adminStripeNotice adminStripeNoticeError" role="alert">
          <CircleDollarSign size={19} />
          <div><strong>Stripe billing is temporarily unavailable.</strong><span>{loadError}</span></div>
        </div>
      )}

      <section className="adminWorkspaceStats" aria-label="Invoice summary">
        <div><span>Outstanding</span><strong>{money(metrics.outstanding)}</strong></div>
        <div><span>Overdue</span><strong>{metrics.overdue}</strong></div>
        <div><span>Drafts</span><strong>{metrics.drafts}</strong></div>
        <div><span>Paid, 30 days</span><strong>{money(metrics.paidLast30)}</strong></div>
      </section>

      <section className="workspaceToolbar adminWorkspaceToolbar">
        <label className="workspaceSearch">
          <Search size={17} />
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search invoice, customer, or vehicle" aria-label="Search invoices" />
        </label>
        <div className="segmentedControl" role="tablist" aria-label="Invoice status">
          {statuses.map(([value, label]) => (
            <button type="button" role="tab" aria-selected={filter === value} onClick={() => setFilter(value)} key={value}>
              {label}
            </button>
          ))}
        </div>
      </section>

      {message && <p className={`workspaceMessage ${message.includes("could") || message.includes("Choose") || message.includes("failed") ? "formMessageError" : "formMessageSuccess"}`} role="status">{message}</p>}

      <div className={`adminInvoiceLayout ${editorOpen ? "adminInvoiceLayoutEditing" : ""}`}>
        <section className="adminInvoiceList" aria-label="Invoices">
          <div className="adminListMeta"><span>{visibleInvoices.length} invoices</span><small>Stripe is the billing record</small></div>
          {visibleInvoices.map((invoice) => {
            const status = displayStatus(invoice);
            return (
              <button className={`adminInvoiceRow ${selected?.id === invoice.id ? "adminInvoiceRowActive" : ""}`} type="button" onClick={() => selectInvoice(invoice.id)} key={invoice.id}>
                <span className={`adminInvoiceStatusMark adminInvoiceStatusMark${status}`} />
                <span><strong>{invoice.number || "Draft invoice"}</strong><small>{invoice.customer_name}</small></span>
                <span><strong>{dateLabel(invoice.due_date || invoice.created)}</strong><small>{invoice.due_date ? "Due date" : "Created"}</small></span>
                <span><strong>{money(invoice.total, invoice.currency)}</strong><small>{invoice.vehicle_label || "General service"}</small></span>
                <span className={`statusPill status${status}`}>{status}</span>
              </button>
            );
          })}
          {!visibleInvoices.length && (
            <div className="emptyState adminCompactEmpty">
              <ReceiptText size={25} />
              <strong>No matching invoices</strong>
              <p>Adjust the filter or create a new invoice.</p>
            </div>
          )}
        </section>

        {editorOpen ? (
          <aside className="adminInvoiceEditor">
            <div className="adminEditorHeading">
              <div><span className="kicker">Stripe invoice</span><h2>New invoice</h2></div>
              <button className="iconButton" type="button" aria-label="Close invoice editor" title="Close" onClick={() => setEditorOpen(false)}><X size={17} /></button>
            </div>

            <form className="adminInvoiceForm" onSubmit={(event) => { event.preventDefault(); createInvoice("draft"); }}>
              <label className="formSpan">
                <span>Customer</span>
                <select value={draft.userId} onChange={(event) => setDraft((current) => ({ ...current, userId: event.target.value, vehicleId: "" }))} required>
                  <option value="">Choose a customer</option>
                  {customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.name} - {customer.email}</option>)}
                </select>
              </label>
              <label>
                <span>Vehicle</span>
                <select value={draft.vehicleId} onChange={(event) => setDraft((current) => ({ ...current, vehicleId: event.target.value }))}>
                  <option value="">General service</option>
                  {availableVehicles.map((vehicle) => <option value={vehicle.id} key={vehicle.id}>{vehicle.nickname || vehicle.model} - {vehicle.year} {vehicle.make}</option>)}
                </select>
              </label>
              <label>
                <span>Payment terms</span>
                <select value={draft.dueDays} onChange={(event) => setDraft((current) => ({ ...current, dueDays: event.target.value }))}>
                  {terms.map((days) => <option value={days} key={days}>Net {days}</option>)}
                </select>
              </label>
              <label className="formSpan">
                <span>Reference or PO</span>
                <input value={draft.reference} onChange={(event) => setDraft((current) => ({ ...current, reference: event.target.value }))} maxLength="140" placeholder="Optional job, PO, or internal reference" />
              </label>

              <div className="adminInvoiceLines formSpan">
                <div className="adminInvoiceLinesHeading"><div><span className="kicker">Line items</span><strong>Services and charges</strong></div><button className="adminSyncButton" type="button" onClick={addLine}><Plus size={14} /> Add line</button></div>
                {draft.lineItems.map((item, index) => (
                  <div className="adminInvoiceLineEditor" key={item.id}>
                    <label><span>Description</span><input value={item.description} onChange={(event) => updateLine(item.id, "description", event.target.value)} required maxLength="240" placeholder={index === 0 ? "Membership detail or custom service" : "Additional service"} /></label>
                    <label><span>Qty</span><input type="number" min="1" max="100" step="1" value={item.quantity} onChange={(event) => updateLine(item.id, "quantity", event.target.value)} required /></label>
                    <label><span>Rate</span><div className="adminMoneyInput"><span>$</span><input type="number" min="0.50" max="100000" step="0.01" value={item.rate} onChange={(event) => updateLine(item.id, "rate", event.target.value)} required placeholder="0.00" /></div></label>
                    <button className="iconButton" type="button" aria-label={`Remove line ${index + 1}`} title="Remove line" disabled={draft.lineItems.length === 1} onClick={() => removeLine(item.id)}><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>

              <label className="formSpan">
                <span>Invoice memo</span>
                <textarea rows="3" value={draft.memo} onChange={(event) => setDraft((current) => ({ ...current, memo: event.target.value }))} maxLength="500" placeholder="Summary visible on the invoice" />
              </label>
              <label className="formSpan">
                <span>Footer</span>
                <textarea rows="2" value={draft.footer} onChange={(event) => setDraft((current) => ({ ...current, footer: event.target.value }))} maxLength="500" />
              </label>

              <div className="adminInvoiceTotal formSpan"><span>Invoice total</span><strong>{money(invoiceTotal)}</strong></div>
              <div className="adminInvoiceEditorActions formSpan">
                <button className="button buttonOutline" type="submit" disabled={Boolean(busy) || !canInvoice}>{busy === "draft" ? "Saving..." : "Save draft"}</button>
                <button className="button buttonDark" type="button" disabled={Boolean(busy) || !canInvoice} onClick={() => createInvoice("send")}><Send size={16} /> {busy === "send" ? "Sending..." : "Create and send"}</button>
              </div>
            </form>
          </aside>
        ) : selected ? (
          <aside className="adminInvoiceDetail">
            <div className="adminInvoiceDetailHeader">
              <div className="adminInvoiceDocumentIcon"><FileText size={20} /></div>
              <div><span className="kicker">Invoice record</span><h2>{selected.number || "Draft invoice"}</h2><p>Created {dateLabel(selected.created)}</p></div>
              <span className={`statusPill status${displayStatus(selected)}`}>{displayStatus(selected)}</span>
            </div>

            <div className="adminInvoiceCustomer">
              <div><UserRound size={17} /><span><small>Bill to</small><strong>{selected.customer_name}</strong><a href={`mailto:${selected.customer_email}`}>{selected.customer_email}</a></span></div>
              {selected.user_id && <Link href={`/admin/customers?customer=${selected.user_id}`}>Open customer <ArrowUpRight size={15} /></Link>}
            </div>

            <div className="adminInvoiceFacts">
              <span><small>Total</small><strong>{money(selected.total, selected.currency)}</strong></span>
              <span><small>Remaining</small><strong>{money(selected.amount_remaining, selected.currency)}</strong></span>
              <span><small>Due</small><strong>{dateLabel(selected.due_date)}</strong></span>
            </div>

            {selected.vehicle_label && <div className="adminInvoiceContext"><strong>Vehicle</strong><span>{selected.vehicle_label}</span></div>}
            {selected.reference && <div className="adminInvoiceContext"><strong>Reference</strong><span>{selected.reference}</span></div>}
            {selected.description && <div className="adminInvoiceContext"><strong>Memo</strong><span>{selected.description}</span></div>}

            <div className="adminInvoiceLineList">
              <div className="adminInvoiceLineListHeading"><span>Description</span><span>Qty</span><span>Amount</span></div>
              {selected.lines.map((line) => (
                <div key={line.id}><span>{line.description}</span><span>{line.quantity}</span><strong>{money(line.amount, selected.currency)}</strong></div>
              ))}
              <div className="adminInvoiceLineTotal"><span>Total</span><strong>{money(selected.total, selected.currency)}</strong></div>
            </div>

            <div className="adminInvoiceActions">
              {selected.status === "draft" && <button className="button buttonDark" type="button" disabled={Boolean(busy)} onClick={() => runInvoiceAction("send")}><Send size={16} /> {busy === "send" ? "Sending..." : "Finalize and send"}</button>}
              {selected.status === "open" && <button className="button buttonDark" type="button" disabled={Boolean(busy)} onClick={() => runInvoiceAction("resend")}><Mail size={16} /> {busy === "resend" ? "Sending..." : "Resend email"}</button>}
              {selected.hosted_invoice_url && selected.hosted_invoice_url !== "#" && <a className="button buttonOutline" href={selected.hosted_invoice_url} target="_blank" rel="noreferrer">Payment page <ArrowUpRight size={16} /></a>}
              {selected.invoice_pdf && selected.invoice_pdf !== "#" && <a className="button buttonOutline" href={selected.invoice_pdf} target="_blank" rel="noreferrer"><Download size={16} /> PDF</a>}
              {preview && selected.status !== "draft" && <button className="button buttonOutline" type="button" disabled title="Live Stripe links appear after configuration"><ArrowUpRight size={16} /> Payment page</button>}
              {selected.status === "draft" && <button className="textButtonDanger" type="button" onClick={() => setConfirmAction("delete")}><Trash2 size={15} /> Delete draft</button>}
              {selected.status === "open" && <button className="textButtonDanger" type="button" onClick={() => setConfirmAction("void")}><X size={15} /> Void invoice</button>}
            </div>

            {confirmAction && (
              <div className="confirmStrip">
                <span><strong>{confirmAction === "delete" ? "Delete this draft?" : "Void this invoice?"}</strong><small>{confirmAction === "delete" ? "This removes the draft from Stripe." : "The customer will no longer be able to pay it."}</small></span>
                <button className="button buttonOutline" type="button" onClick={() => setConfirmAction("")}>Keep it</button>
                <button className="button buttonDanger" type="button" disabled={Boolean(busy)} onClick={() => runInvoiceAction(confirmAction)}>{busy ? "Working..." : confirmAction === "delete" ? "Delete" : "Void"}</button>
              </div>
            )}

            {selected.status === "paid" && <div className="adminPaidNotice"><Check size={17} /><div><strong>Paid in full</strong><span>Stripe recorded payment on {dateLabel(selected.paid_at)}.</span></div></div>}
            {selected.footer && <p className="adminInvoiceFooter">{selected.footer}</p>}
          </aside>
        ) : (
          <aside className="adminInvoiceDetail adminInvoiceEmptyDetail">
            <ReceiptText size={28} />
            <strong>Select or create an invoice</strong>
            <p>Invoice details and Stripe actions appear here.</p>
            <button className="button buttonDark" type="button" disabled={!canInvoice} onClick={() => openEditor()}><Plus size={16} /> New invoice</button>
          </aside>
        )}
      </div>

      {preview && <small className="previewLine">Preview invoices are simulated. Stripe emails and payment links are available after deployment configuration.</small>}
    </div>
  );
}
