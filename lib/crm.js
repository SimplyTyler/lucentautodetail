export const customerTypes = [
  { code: "consumer", name: "Consumer" },
  { code: "collector", name: "Collector / exotic" },
  { code: "business", name: "Business / fleet" }
];

export const lifecycleStages = [
  { code: "lead", name: "Lead" },
  { code: "prospect", name: "Prospect" },
  { code: "active", name: "Active customer" },
  { code: "at_risk", name: "At risk" },
  { code: "inactive", name: "Inactive" }
];

export const contactMethods = [
  { code: "email", name: "Email" },
  { code: "phone", name: "Phone call" },
  { code: "text", name: "Text message" }
];

export const activityTypes = [
  { code: "note", name: "Note" },
  { code: "call", name: "Call" },
  { code: "email", name: "Email" },
  { code: "text", name: "Text" },
  { code: "follow_up", name: "Follow-up" }
];

const customerTypeCodes = new Set(customerTypes.map((item) => item.code));
const lifecycleCodes = new Set(lifecycleStages.map((item) => item.code));
const contactCodes = new Set(contactMethods.map((item) => item.code));
const activityCodes = new Set(activityTypes.map((item) => item.code));

function clean(value, limit) {
  return String(value || "").trim().slice(0, limit) || null;
}

function normalizeTags(value) {
  const values = Array.isArray(value) ? value : String(value || "").split(",");
  return [...new Set(values.map((item) => String(item).trim().toLowerCase().slice(0, 32)).filter(Boolean))].slice(0, 12);
}

export function normalizeCustomerInput(body = {}) {
  const name = clean(body.name, 120);
  const email = String(body.email || "").trim().toLowerCase().slice(0, 180);
  if (!name || name.length < 2) return { error: "Enter the customer name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid customer email." };

  return {
    value: {
      name,
      email,
      phone: clean(body.phone, 40),
      company_name: clean(body.companyName, 120),
      customer_type: customerTypeCodes.has(body.customerType) ? body.customerType : "consumer",
      lifecycle_stage: lifecycleCodes.has(body.lifecycleStage) ? body.lifecycleStage : "lead",
      preferred_contact: contactCodes.has(body.preferredContact) ? body.preferredContact : "email",
      address_line1: clean(body.addressLine1, 160),
      address_line2: clean(body.addressLine2, 160),
      city: clean(body.city, 100),
      state: String(body.state || "").trim().toUpperCase().slice(0, 3) || null,
      postal_code: clean(body.postalCode, 20),
      country: String(body.country || "US").trim().toUpperCase().slice(0, 2) || "US",
      tags: normalizeTags(body.tags),
      acquisition_source: clean(body.acquisitionSource, 80),
      admin_notes: clean(body.adminNotes, 4000)
    }
  };
}

export function normalizeActivityInput(body = {}) {
  const activityType = activityCodes.has(body.activityType) ? body.activityType : "note";
  const subject = clean(body.subject, 140);
  const details = clean(body.details, 2000);
  const dueDate = String(body.dueDate || "").trim();
  if (!subject) return { error: "Add a short activity subject." };
  if (activityType === "follow_up" && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    return { error: "Choose a due date for the follow-up." };
  }

  return {
    value: {
      activity_type: activityType,
      subject,
      details,
      due_at: activityType === "follow_up" ? new Date(`${dueDate}T12:00:00-07:00`) : null
    }
  };
}
