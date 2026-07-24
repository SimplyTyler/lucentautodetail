import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "../../../../lib/admin";
import { hasDatabase, query } from "../../../../lib/db";
import { ensureStripeCustomer, presentInvoice } from "../../../../lib/invoices";
import { getStripe, hasStripe } from "../../../../lib/stripe";

const dueDayOptions = new Set([7, 14, 30, 45]);

function normalizeLineItems(value) {
  if (!Array.isArray(value) || !value.length || value.length > 20) return null;
  const items = value.map((item) => ({
    description: String(item.description || "").trim().slice(0, 240),
    quantity: Number(item.quantity),
    unitAmount: Math.round(Number(item.unitAmount))
  }));
  if (items.some((item) => !item.description || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 100 || !Number.isInteger(item.unitAmount) || item.unitAmount < 50 || item.unitAmount > 10000000)) {
    return null;
  }
  return items;
}

function previewInvoice(body, lineItems, customer, vehicle) {
  const now = Math.floor(Date.now() / 1000);
  const dueDays = dueDayOptions.has(Number(body.dueDays)) ? Number(body.dueDays) : 14;
  const sent = body.action === "send";
  const total = lineItems.reduce((sum, item) => sum + item.quantity * item.unitAmount, 0);
  return {
    id: `in_preview_${randomUUID()}`,
    number: sent ? `LUCENT-${Math.floor(1000 + Math.random() * 8000)}` : null,
    user_id: customer.id,
    customer_name: customer.name,
    customer_email: customer.email,
    status: sent ? "open" : "draft",
    currency: "usd",
    total,
    amount_due: total,
    amount_paid: 0,
    amount_remaining: total,
    created: now,
    due_date: sent ? now + dueDays * 86400 : null,
    paid_at: null,
    description: String(body.memo || "").trim() || null,
    reference: String(body.reference || "").trim() || null,
    footer: String(body.footer || "").trim() || null,
    hosted_invoice_url: sent ? "#" : null,
    invoice_pdf: sent ? "#" : null,
    vehicle_id: vehicle?.id || null,
    vehicle_label: vehicle ? `${vehicle.nickname || vehicle.model} - ${vehicle.year} ${vehicle.make} ${vehicle.model}` : null,
    lines: lineItems.map((item) => ({ id: randomUUID(), description: item.description, quantity: item.quantity, amount: item.quantity * item.unitAmount }))
  };
}

export async function POST(request) {
  const admin = await authorizeAdminRequest();
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  let createdInvoiceId = null;
  try {
    const body = await request.json();
    const userId = String(body.userId || "").trim();
    const vehicleId = String(body.vehicleId || "").trim() || null;
    const lineItems = normalizeLineItems(body.lineItems);
    const dueDays = dueDayOptions.has(Number(body.dueDays)) ? Number(body.dueDays) : 14;
    const action = body.action === "send" ? "send" : "draft";
    const memo = String(body.memo || "").trim().slice(0, 500) || null;
    const footer = String(body.footer || "").trim().slice(0, 500) || null;
    const reference = String(body.reference || "").trim().slice(0, 140) || null;
    if (!userId) return NextResponse.json({ error: "Choose a customer." }, { status: 400 });
    if (!lineItems) return NextResponse.json({ error: "Add at least one valid invoice line." }, { status: 400 });

    if (!hasDatabase()) {
      const customer = { id: userId, name: String(body.customerName || "Preview customer"), email: String(body.customerEmail || "preview@example.com") };
      const vehicle = vehicleId ? { id: vehicleId, year: body.vehicleYear, make: body.vehicleMake, model: body.vehicleModel, nickname: body.vehicleNickname } : null;
      return NextResponse.json({ invoice: previewInvoice({ ...body, action }, lineItems, customer, vehicle), preview: true }, { status: 201 });
    }
    if (!hasStripe()) return NextResponse.json({ error: "Stripe invoicing is not configured." }, { status: 503 });

    const customerResult = await query("SELECT * FROM users WHERE id = $1 AND role = 'user'", [userId]);
    const customer = customerResult.rows[0];
    if (!customer) return NextResponse.json({ error: "Customer was not found." }, { status: 404 });
    let vehicle = null;
    if (vehicleId) {
      const vehicleResult = await query("SELECT * FROM vehicles WHERE id = $1 AND user_id = $2", [vehicleId, userId]);
      vehicle = vehicleResult.rows[0];
      if (!vehicle) return NextResponse.json({ error: "That vehicle does not belong to this customer." }, { status: 400 });
    }

    const stripe = getStripe();
    const stripeCustomerId = await ensureStripeCustomer(customer);
    if (!customer.stripe_customer_id) {
      await query("UPDATE users SET stripe_customer_id = $1, updated_at = NOW() WHERE id = $2", [stripeCustomerId, userId]);
    }
    const customFields = [];
    if (vehicle) customFields.push({ name: "Vehicle", value: `${vehicle.nickname || vehicle.model} - ${vehicle.year} ${vehicle.make} ${vehicle.model}`.slice(0, 140) });
    if (reference) customFields.push({ name: "Reference", value: reference });

    let invoice = await stripe.invoices.create({
      customer: stripeCustomerId,
      collection_method: "send_invoice",
      days_until_due: dueDays,
      auto_advance: false,
      description: memo || undefined,
      footer: footer || undefined,
      custom_fields: customFields.length ? customFields : undefined,
      metadata: {
        user_id: userId,
        vehicle_id: vehicleId || "",
        created_by: admin.id,
        source: "lucent_crm"
      }
    });
    createdInvoiceId = invoice.id;
    for (const item of lineItems) {
      await stripe.invoiceItems.create({
        customer: stripeCustomerId,
        invoice: invoice.id,
        currency: "usd",
        description: item.description,
        quantity: item.quantity,
        unit_amount_decimal: String(item.unitAmount)
      });
    }
    if (action === "send") {
      invoice = await stripe.invoices.finalizeInvoice(invoice.id);
      invoice = await stripe.invoices.sendInvoice(invoice.id);
    } else {
      invoice = await stripe.invoices.retrieve(invoice.id);
    }
    return NextResponse.json({ invoice: presentInvoice(invoice, [customer]) }, { status: 201 });
  } catch (error) {
    if (createdInvoiceId && hasStripe()) {
      try {
        const orphan = await getStripe().invoices.retrieve(createdInvoiceId);
        if (orphan.status === "draft") await getStripe().invoices.del(createdInvoiceId);
      } catch (cleanupError) {
        console.error("Incomplete Stripe invoice cleanup failed", cleanupError);
      }
    }
    console.error("Admin invoice creation failed", error);
    return NextResponse.json({ error: "Invoice could not be created in Stripe." }, { status: 500 });
  }
}
