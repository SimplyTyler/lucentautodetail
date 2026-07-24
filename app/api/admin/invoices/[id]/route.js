import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "../../../../../lib/admin";
import { hasDatabase } from "../../../../../lib/db";
import { presentInvoice } from "../../../../../lib/invoices";
import { getStripe, hasStripe } from "../../../../../lib/stripe";

export async function PATCH(request, { params }) {
  const admin = await authorizeAdminRequest();
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  try {
    const { id } = await params;
    const body = await request.json();
    const action = String(body.action || "");
    if (!["send", "resend", "void", "delete"].includes(action)) {
      return NextResponse.json({ error: "Choose a valid invoice action." }, { status: 400 });
    }
    if (!hasDatabase()) {
      if (action === "delete") return NextResponse.json({ deleted: true, id, preview: true });
      return NextResponse.json({
        invoice: {
          id,
          status: action === "void" ? "void" : "open",
          number: body.number || "LUCENT-PREVIEW",
          hosted_invoice_url: action === "void" ? null : "#",
          invoice_pdf: action === "void" ? null : "#"
        },
        preview: true
      });
    }
    if (!hasStripe()) return NextResponse.json({ error: "Stripe invoicing is not configured." }, { status: 503 });

    const stripe = getStripe();
    let invoice = await stripe.invoices.retrieve(id);
    if (action === "delete") {
      if (invoice.status !== "draft") return NextResponse.json({ error: "Only draft invoices can be deleted." }, { status: 409 });
      await stripe.invoices.del(id);
      return NextResponse.json({ deleted: true, id });
    }
    if (action === "void") {
      if (invoice.status !== "open") return NextResponse.json({ error: "Only open invoices can be voided." }, { status: 409 });
      invoice = await stripe.invoices.voidInvoice(id);
    } else {
      if (invoice.status === "draft") invoice = await stripe.invoices.finalizeInvoice(id);
      if (invoice.status !== "open") return NextResponse.json({ error: "Only draft or open invoices can be sent." }, { status: 409 });
      invoice = await stripe.invoices.sendInvoice(id);
    }
    return NextResponse.json({ invoice: presentInvoice(invoice, []) });
  } catch (error) {
    console.error("Admin invoice action failed", error);
    return NextResponse.json({ error: "Stripe could not complete that invoice action." }, { status: 500 });
  }
}
