import { hasDatabase } from "./db";
import { getStripe, hasStripe } from "./stripe";
import { currentBusinessDate } from "./visits";

const secondsFromNow = (days) => Math.floor((Date.now() + days * 86400000) / 1000);

const demoInvoices = [
  {
    id: "in_preview_1", number: "LUCENT-1048", user_id: "admin-user-1", customer_name: "Alex Morgan",
    customer_email: "alex@example.com", stripe_customer_id: "cus_preview_admin-user-1", status: "open",
    currency: "usd", total: 42500, amount_due: 42500, amount_paid: 0, amount_remaining: 42500,
    created: secondsFromNow(-2), due_date: secondsFromNow(7), paid_at: null, description: "Collector care follow-up", reference: "COLLECTOR-1048",
    footer: "Thank you for trusting Lucent with your vehicles.", hosted_invoice_url: "#", invoice_pdf: "#",
    vehicle_id: "admin-vehicle-1", vehicle_label: "Graphite - 2024 Porsche 911 GT3",
    lines: [
      { id: "il_preview_1", description: "Protection inspection and decontamination", quantity: 1, amount: 32500 },
      { id: "il_preview_2", description: "Wheel coating refresh", quantity: 1, amount: 10000 }
    ]
  },
  {
    id: "in_preview_2", number: null, user_id: "admin-user-5", customer_name: "Maya Chen",
    customer_email: "maya@example.com", stripe_customer_id: "cus_preview_admin-user-5", status: "draft",
    currency: "usd", total: 29900, amount_due: 29900, amount_paid: 0, amount_remaining: 29900,
    created: secondsFromNow(-1), due_date: null, paid_at: null, description: "Collector consultation and correction plan", reference: null,
    footer: "Payment is due after the scheduled service.", hosted_invoice_url: null, invoice_pdf: null,
    vehicle_id: "admin-vehicle-8", vehicle_label: "Mazda - 2021 Mazda CX-5",
    lines: [{ id: "il_preview_3", description: "Paint assessment and one-step correction", quantity: 1, amount: 29900 }]
  },
  {
    id: "in_preview_3", number: "LUCENT-1046", user_id: "admin-user-2", customer_name: "Northline Realty",
    customer_email: "ops@northline.example", stripe_customer_id: "cus_preview_admin-user-2", status: "paid",
    currency: "usd", total: 94800, amount_due: 94800, amount_paid: 94800, amount_remaining: 0,
    created: secondsFromNow(-12), due_date: secondsFromNow(2), paid_at: secondsFromNow(-8), description: "Grouped fleet service", reference: "NL-Q3-14",
    footer: "Thank you for your business.", hosted_invoice_url: "#", invoice_pdf: "#",
    vehicle_id: "admin-vehicle-3", vehicle_label: "Unit 14 - 2025 Ford Transit",
    lines: [{ id: "il_preview_4", description: "Fleet maintenance detail", quantity: 12, amount: 94800 }]
  },
  {
    id: "in_preview_4", number: "LUCENT-1043", user_id: "admin-user-4", customer_name: "Summit Executive",
    customer_email: "fleet@summit.example", stripe_customer_id: "cus_preview_admin-user-4", status: "open",
    currency: "usd", total: 55300, amount_due: 55300, amount_paid: 0, amount_remaining: 55300,
    created: secondsFromNow(-21), due_date: secondsFromNow(-7), paid_at: null, description: "Executive fleet care", reference: "SUM-AP3",
    footer: "Please contact Lucent with billing questions.", hosted_invoice_url: "#", invoice_pdf: "#",
    vehicle_id: "admin-vehicle-7", vehicle_label: "Airport 3 - 2023 Mercedes-Benz Sprinter",
    lines: [{ id: "il_preview_5", description: "Fleet interior and exterior care", quantity: 7, amount: 55300 }]
  }
];

function customerAddress(customer) {
  const hasAddress = Boolean(customer.address_line1 || customer.address_line2 || customer.city || customer.state || customer.postal_code);
  if (!hasAddress) return "";
  return {
    line1: customer.address_line1 || "",
    line2: customer.address_line2 || "",
    city: customer.city || "",
    state: customer.state || "",
    postal_code: customer.postal_code || "",
    country: customer.country || "US"
  };
}

export function stripeCustomerParams(customer) {
  return {
    name: customer.name,
    email: customer.email,
    phone: customer.phone || "",
    address: customerAddress(customer),
    metadata: {
      user_id: customer.id,
      company_name: customer.company_name || "",
      customer_type: customer.customer_type || "consumer",
      lifecycle_stage: customer.lifecycle_stage || "lead"
    }
  };
}

export async function ensureStripeCustomer(customer) {
  const stripe = getStripe();
  if (customer.stripe_customer_id) {
    await stripe.customers.update(customer.stripe_customer_id, stripeCustomerParams(customer));
    return customer.stripe_customer_id;
  }
  const created = await stripe.customers.create(stripeCustomerParams(customer));
  return created.id;
}

function normalizeInvoice(invoice, customers) {
  const stripeCustomerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  const customer = customers.find((item) => item.id === invoice.metadata?.user_id)
    || customers.find((item) => item.stripe_customer_id === stripeCustomerId);
  const vehicleLabel = invoice.custom_fields?.find((field) => field.name === "Vehicle")?.value || null;
  const reference = invoice.custom_fields?.find((field) => field.name === "Reference")?.value || null;
  return {
    id: invoice.id,
    number: invoice.number,
    user_id: invoice.metadata?.user_id || customer?.id || null,
    customer_name: invoice.customer_name || customer?.name || "Stripe customer",
    customer_email: invoice.customer_email || customer?.email || "",
    stripe_customer_id: stripeCustomerId,
    status: invoice.status,
    currency: invoice.currency,
    total: invoice.total || 0,
    amount_due: invoice.amount_due || 0,
    amount_paid: invoice.amount_paid || 0,
    amount_remaining: invoice.amount_remaining || 0,
    created: invoice.created,
    due_date: invoice.due_date,
    paid_at: invoice.status_transitions?.paid_at || null,
    description: invoice.description,
    reference,
    footer: invoice.footer,
    hosted_invoice_url: invoice.hosted_invoice_url,
    invoice_pdf: invoice.invoice_pdf,
    vehicle_id: invoice.metadata?.vehicle_id || null,
    vehicle_label: vehicleLabel,
    lines: invoice.lines?.data?.map((line) => ({
      id: line.id,
      description: line.description,
      quantity: line.quantity || 1,
      amount: line.amount
    })) || []
  };
}

export function invoiceMetrics(invoices) {
  const today = currentBusinessDate();
  const paidSince = Math.floor((Date.now() - 30 * 86400000) / 1000);
  return {
    outstanding: invoices.filter((invoice) => invoice.status === "open").reduce((sum, invoice) => sum + invoice.amount_remaining, 0),
    overdue: invoices.filter((invoice) => invoice.status === "open" && invoice.due_date && new Date(invoice.due_date * 1000).toISOString().slice(0, 10) < today).length,
    drafts: invoices.filter((invoice) => invoice.status === "draft").length,
    paidLast30: invoices.filter((invoice) => invoice.status === "paid" && (invoice.paid_at || invoice.created) >= paidSince).reduce((sum, invoice) => sum + invoice.amount_paid, 0)
  };
}

export async function getAdminInvoiceData(customers) {
  if (!hasDatabase()) {
    return { preview: true, configured: false, invoices: demoInvoices, metrics: invoiceMetrics(demoInvoices) };
  }
  if (!hasStripe()) {
    return { preview: false, configured: false, invoices: [], metrics: invoiceMetrics([]) };
  }

  try {
    const result = await getStripe().invoices.list({ limit: 100 });
    const invoices = result.data.map((invoice) => normalizeInvoice(invoice, customers));
    return { preview: false, configured: true, invoices, metrics: invoiceMetrics(invoices), error: null };
  } catch (error) {
    console.error("Stripe invoices could not be loaded", error);
    return {
      preview: false,
      configured: true,
      invoices: [],
      metrics: invoiceMetrics([]),
      error: "Stripe invoices could not be loaded. Customer and service data are still available."
    };
  }
}

export function presentInvoice(invoice, customers) {
  return normalizeInvoice(invoice, customers);
}
