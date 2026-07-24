import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "../../../../../lib/admin";
import { normalizeCustomerInput } from "../../../../../lib/crm";
import { hasDatabase, query } from "../../../../../lib/db";
import { getStripe, hasStripe } from "../../../../../lib/stripe";

export async function PATCH(request, { params }) {
  const admin = await authorizeAdminRequest();
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  try {
    const { id } = await params;
    const normalized = normalizeCustomerInput(await request.json());
    if (normalized.error) return NextResponse.json({ error: normalized.error }, { status: 400 });
    const value = normalized.value;
    if (!hasDatabase()) return NextResponse.json({ customer: { id, ...value }, preview: true });

    const existingResult = await query("SELECT * FROM users WHERE id = $1 AND role = 'user'", [id]);
    const existing = existingResult.rows[0];
    if (!existing) return NextResponse.json({ error: "Customer was not found." }, { status: 404 });
    const duplicate = await query("SELECT id FROM users WHERE LOWER(email) = $1 AND id <> $2 LIMIT 1", [value.email, id]);
    if (duplicate.rows[0]) return NextResponse.json({ error: "Another account already uses that email." }, { status: 409 });

    const result = await query(
      `UPDATE users SET
         name = $1, email = $2, phone = $3, company_name = $4, customer_type = $5,
         lifecycle_stage = $6, preferred_contact = $7, address_line1 = $8,
         address_line2 = $9, city = $10, state = $11, postal_code = $12,
         country = $13, tags = $14, acquisition_source = $15, admin_notes = $16,
         updated_at = NOW()
       WHERE id = $17
       RETURNING id, name, email, phone, company_name, customer_type, lifecycle_stage,
         preferred_contact, address_line1, address_line2, city, state, postal_code,
         country, tags, acquisition_source, admin_notes, stripe_customer_id, created_at`,
      [
        value.name, value.email, value.phone, value.company_name, value.customer_type,
        value.lifecycle_stage, value.preferred_contact, value.address_line1,
        value.address_line2, value.city, value.state, value.postal_code,
        value.country, value.tags, value.acquisition_source, value.admin_notes, id
      ]
    );
    let warning = null;
    if (existing.stripe_customer_id && hasStripe()) {
      try {
        const hasAddress = Boolean(value.address_line1 || value.address_line2 || value.city || value.state || value.postal_code);
        await getStripe().customers.update(existing.stripe_customer_id, {
          name: value.name,
          email: value.email,
          phone: value.phone || "",
          address: hasAddress ? {
            line1: value.address_line1 || "",
            line2: value.address_line2 || "",
            city: value.city || "",
            state: value.state || "",
            postal_code: value.postal_code || "",
            country: value.country
          } : "",
          metadata: {
            user_id: id,
            company_name: value.company_name || "",
            customer_type: value.customer_type,
            lifecycle_stage: value.lifecycle_stage
          }
        });
      } catch (stripeError) {
        console.error("Stripe customer synchronization failed", stripeError);
        warning = "Customer profile saved, but Stripe billing details could not be synchronized.";
      }
    }
    return NextResponse.json({ customer: result.rows[0], warning });
  } catch (error) {
    console.error("Admin customer update failed", error);
    return NextResponse.json({ error: "Customer details could not be saved or synchronized." }, { status: 500 });
  }
}
