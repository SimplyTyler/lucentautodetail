import { hasDatabase, query } from "./db";
import { getPlan } from "./plans";
import { currentBusinessDate } from "./visits";

const dateFromNow = (days) => {
  const [year, month, day] = currentBusinessDate().split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days, 12));
  return date.toISOString().slice(0, 10);
};

const timestampFromNow = (days) => new Date(Date.now() + days * 86400000).toISOString();

const demoCustomers = [
  {
    id: "admin-user-1",
    name: "Alex Morgan",
    email: "alex@example.com",
    phone: "(602) 555-0148",
    company_name: null,
    customer_type: "collector",
    lifecycle_stage: "active",
    preferred_contact: "text",
    address_line1: "2140 E Camelback Rd",
    address_line2: null,
    city: "Phoenix",
    state: "AZ",
    postal_code: "85016",
    country: "US",
    tags: ["collector", "ceramic"],
    acquisition_source: "Referral",
    stripe_customer_id: "cus_preview_alex",
    admin_notes: "Prefers text confirmation. Side gate code is stored on each visit.",
    created_at: timestampFromNow(-70),
    membership_id: "admin-membership-1",
    plan_code: "reserve",
    vehicle_count: 2,
    membership_status: "active",
    cancel_at_period_end: false,
    current_period_end: timestampFromNow(21),
    vehicle_total: 2,
    last_visit_at: dateFromNow(-25)
  },
  {
    id: "admin-user-2",
    name: "Northline Realty",
    email: "ops@northline.example",
    phone: "(480) 555-0194",
    company_name: "Northline Realty Group",
    customer_type: "business",
    lifecycle_stage: "active",
    preferred_contact: "email",
    address_line1: "100 N Central Ave",
    address_line2: "Suite 820",
    city: "Phoenix",
    state: "AZ",
    postal_code: "85004",
    country: "US",
    tags: ["fleet", "priority"],
    acquisition_source: "Google",
    stripe_customer_id: "cus_preview_northline",
    admin_notes: "Coordinate grouped service with facilities before arrival.",
    created_at: timestampFromNow(-46),
    membership_id: "admin-membership-2",
    plan_code: "fleet",
    vehicle_count: 12,
    membership_status: "active",
    cancel_at_period_end: false,
    current_period_end: timestampFromNow(18),
    vehicle_total: 3,
    last_visit_at: dateFromNow(-8)
  },
  {
    id: "admin-user-3",
    name: "Jordan Ellis",
    email: "jordan@example.com",
    phone: "(623) 555-0186",
    company_name: null,
    customer_type: "consumer",
    lifecycle_stage: "active",
    preferred_contact: "email",
    address_line1: "812 W Rose Ln",
    address_line2: null,
    city: "Phoenix",
    state: "AZ",
    postal_code: "85013",
    country: "US",
    tags: ["new-member"],
    acquisition_source: "Instagram",
    stripe_customer_id: "cus_preview_jordan",
    admin_notes: null,
    created_at: timestampFromNow(-8),
    membership_id: "admin-membership-3",
    plan_code: "drive",
    vehicle_count: 1,
    membership_status: "trialing",
    cancel_at_period_end: false,
    current_period_end: timestampFromNow(6),
    vehicle_total: 1,
    last_visit_at: null
  },
  {
    id: "admin-user-4",
    name: "Summit Executive",
    email: "fleet@summit.example",
    phone: "(602) 555-0121",
    company_name: "Summit Executive Transport",
    customer_type: "business",
    lifecycle_stage: "at_risk",
    preferred_contact: "phone",
    address_line1: "3200 E Sky Harbor Blvd",
    address_line2: "Dispatch Office",
    city: "Phoenix",
    state: "AZ",
    postal_code: "85034",
    country: "US",
    tags: ["fleet", "payment-attention"],
    acquisition_source: "Partner",
    stripe_customer_id: "cus_preview_summit",
    admin_notes: "Billing contact is reviewing an expired card.",
    created_at: timestampFromNow(-120),
    membership_id: "admin-membership-4",
    plan_code: "fleet",
    vehicle_count: 7,
    membership_status: "past_due",
    cancel_at_period_end: false,
    current_period_end: timestampFromNow(-2),
    vehicle_total: 1,
    last_visit_at: dateFromNow(-12)
  },
  {
    id: "admin-user-5",
    name: "Maya Chen",
    email: "maya@example.com",
    phone: "(480) 555-0162",
    company_name: null,
    customer_type: "collector",
    lifecycle_stage: "prospect",
    preferred_contact: "text",
    address_line1: null,
    address_line2: null,
    city: "Scottsdale",
    state: "AZ",
    postal_code: "85251",
    country: "US",
    tags: ["collector-lead"],
    acquisition_source: "Car show",
    stripe_customer_id: null,
    admin_notes: "Requested a collector-plan consultation.",
    created_at: timestampFromNow(-3),
    membership_id: null,
    plan_code: null,
    vehicle_count: 0,
    membership_status: null,
    cancel_at_period_end: false,
    current_period_end: null,
    vehicle_total: 1,
    last_visit_at: null
  }
];

const demoVehicles = [
  { id: "admin-vehicle-1", user_id: "admin-user-1", customer_name: "Alex Morgan", customer_email: "alex@example.com", year: 2024, make: "Porsche", model: "911 GT3", nickname: "Graphite", color: "Agate grey", vehicle_type: "collector", license_plate: "LUCENT1", plate_state: "AZ", vin_last_six: "1842GT", service_notes: "Ceramic coating applied. Use pH-neutral chemistry.", covered: true },
  { id: "admin-vehicle-2", user_id: "admin-user-1", customer_name: "Alex Morgan", customer_email: "alex@example.com", year: 2023, make: "Range Rover", model: "Sport", nickname: "Daily", color: "Santorini black", vehicle_type: "daily", license_plate: "DAILY23", plate_state: "AZ", vin_last_six: "90RRS2", service_notes: "Prioritize rear-seat touch points and cargo area.", covered: true },
  { id: "admin-vehicle-3", user_id: "admin-user-2", customer_name: "Northline Realty", customer_email: "ops@northline.example", year: 2025, make: "Ford", model: "Transit", nickname: "Unit 14", color: "Oxford white", vehicle_type: "business", license_plate: "NLRE14", plate_state: "AZ", vin_last_six: "FT2214", service_notes: "Service with the grouped fleet lane.", covered: true },
  { id: "admin-vehicle-4", user_id: "admin-user-2", customer_name: "Northline Realty", customer_email: "ops@northline.example", year: 2024, make: "Chevrolet", model: "Tahoe", nickname: "Unit 08", color: "Black", vehicle_type: "business", license_plate: "NLRE08", plate_state: "AZ", vin_last_six: "TH8408", service_notes: null, covered: true },
  { id: "admin-vehicle-5", user_id: "admin-user-2", customer_name: "Northline Realty", customer_email: "ops@northline.example", year: 2024, make: "Tesla", model: "Model Y", nickname: "Unit 22", color: "Pearl white", vehicle_type: "business", license_plate: "NLRE22", plate_state: "AZ", vin_last_six: "MY4422", service_notes: null, covered: true },
  { id: "admin-vehicle-6", user_id: "admin-user-3", customer_name: "Jordan Ellis", customer_email: "jordan@example.com", year: 2022, make: "BMW", model: "X5", nickname: "X5", color: "Alpine white", vehicle_type: "daily", license_plate: "JEX522", plate_state: "AZ", vin_last_six: "X52231", service_notes: null, covered: true },
  { id: "admin-vehicle-7", user_id: "admin-user-4", customer_name: "Summit Executive", customer_email: "fleet@summit.example", year: 2023, make: "Mercedes-Benz", model: "Sprinter", nickname: "Airport 3", color: "Obsidian black", vehicle_type: "business", license_plate: "SUM003", plate_state: "AZ", vin_last_six: "SP3003", service_notes: "No silicone dressing on cabin surfaces.", covered: true },
  { id: "admin-vehicle-8", user_id: "admin-user-5", customer_name: "Maya Chen", customer_email: "maya@example.com", year: 2021, make: "Mazda", model: "CX-5", nickname: "Mazda", color: "Soul red", vehicle_type: "daily", license_plate: "MAYA21", plate_state: "AZ", vin_last_six: "CX5218", service_notes: "Inspect paint before collector consultation.", covered: false }
];

const demoMemberships = demoCustomers.filter((customer) => customer.membership_id).map((customer) => ({
  id: customer.membership_id,
  user_id: customer.id,
  customer_name: customer.name,
  customer_email: customer.email,
  stripe_subscription_id: `sub_preview_${customer.id}`,
  stripe_customer_id: `cus_preview_${customer.id}`,
  plan_code: customer.plan_code,
  vehicle_count: customer.vehicle_count,
  status: customer.membership_status,
  cancel_at_period_end: customer.cancel_at_period_end,
  current_period_end: customer.current_period_end,
  covered_vehicle_ids: demoVehicles.filter((vehicle) => vehicle.user_id === customer.id && vehicle.covered).map((vehicle) => vehicle.id)
}));

const demoAppointments = [
  { id: "admin-visit-1", user_id: "admin-user-1", customer_name: "Alex Morgan", customer_email: "alex@example.com", vehicle_id: "admin-vehicle-1", make: "Porsche", model: "911 GT3", nickname: "Graphite", preferred_date: dateFromNow(0), preferred_window: "morning", service_type: "protection_refresh", service_location: "home", service_address: "2140 E Camelback Rd, Phoenix, AZ", notes: "Use the side gate.", admin_notes: "Photograph coating condition before service.", assigned_detailer: "Tyler", status: "confirmed" },
  { id: "admin-visit-2", user_id: "admin-user-2", customer_name: "Northline Realty", customer_email: "ops@northline.example", vehicle_id: "admin-vehicle-3", make: "Ford", model: "Transit", nickname: "Unit 14", preferred_date: dateFromNow(0), preferred_window: "midday", service_type: "membership_detail", service_location: "office", service_address: "100 N Central Ave, Phoenix, AZ", notes: null, admin_notes: "Three additional fleet units are staged nearby.", assigned_detailer: "Mia", status: "in_progress" },
  { id: "admin-visit-3", user_id: "admin-user-3", customer_name: "Jordan Ellis", customer_email: "jordan@example.com", vehicle_id: "admin-vehicle-6", make: "BMW", model: "X5", nickname: "X5", preferred_date: dateFromNow(1), preferred_window: "afternoon", service_type: "membership_detail", service_location: "home", service_address: "812 W Rose Ln, Phoenix, AZ", notes: null, admin_notes: null, assigned_detailer: null, status: "requested" },
  { id: "admin-visit-4", user_id: "admin-user-4", customer_name: "Summit Executive", customer_email: "fleet@summit.example", vehicle_id: "admin-vehicle-7", make: "Mercedes-Benz", model: "Sprinter", nickname: "Airport 3", preferred_date: dateFromNow(4), preferred_window: "morning", service_type: "interior_focus", service_location: "office", service_address: "3200 E Sky Harbor Blvd, Phoenix, AZ", notes: "Coordinate with dispatch.", admin_notes: "Confirm payment status before dispatch.", assigned_detailer: "Tyler", status: "confirmed" },
  { id: "admin-visit-5", user_id: "admin-user-1", customer_name: "Alex Morgan", customer_email: "alex@example.com", vehicle_id: "admin-vehicle-2", make: "Range Rover", model: "Sport", nickname: "Daily", preferred_date: dateFromNow(-3), preferred_window: "afternoon", service_type: "interior_focus", service_location: "home", service_address: "2140 E Camelback Rd, Phoenix, AZ", notes: null, admin_notes: null, assigned_detailer: "Mia", status: "completed" },
  { id: "admin-visit-6", user_id: "admin-user-2", customer_name: "Northline Realty", customer_email: "ops@northline.example", vehicle_id: "admin-vehicle-4", make: "Chevrolet", model: "Tahoe", nickname: "Unit 08", preferred_date: dateFromNow(-8), preferred_window: "morning", service_type: "exterior_reset", service_location: "office", service_address: "100 N Central Ave, Phoenix, AZ", notes: null, admin_notes: "Cancelled due to vehicle reassignment.", assigned_detailer: null, status: "cancelled" }
];

const demoActivities = [
  { id: "activity-1", user_id: "admin-user-5", customer_name: "Maya Chen", activity_type: "follow_up", subject: "Collector plan consultation", details: "Call after 3 PM to discuss wash cadence and paint condition.", due_at: timestampFromNow(0), completed_at: null, created_by: "admin", created_at: timestampFromNow(-2), updated_at: timestampFromNow(-2) },
  { id: "activity-2", user_id: "admin-user-4", customer_name: "Summit Executive", activity_type: "follow_up", subject: "Resolve billing contact", details: "Confirm the replacement card and invoice recipient before dispatch.", due_at: timestampFromNow(-1), completed_at: null, created_by: "admin", created_at: timestampFromNow(-4), updated_at: timestampFromNow(-4) },
  { id: "activity-3", user_id: "admin-user-2", customer_name: "Northline Realty", activity_type: "call", subject: "August fleet routing", details: "Facilities approved a two-lane setup for the next grouped visit.", due_at: null, completed_at: null, created_by: "admin", created_at: timestampFromNow(-1), updated_at: timestampFromNow(-1) },
  { id: "activity-4", user_id: "admin-user-1", customer_name: "Alex Morgan", activity_type: "text", subject: "Service confirmation", details: "Confirmed side-gate access and morning arrival.", due_at: null, completed_at: null, created_by: "admin", created_at: timestampFromNow(-3), updated_at: timestampFromNow(-3) },
  { id: "activity-5", user_id: "admin-user-3", customer_name: "Jordan Ellis", activity_type: "email", subject: "Welcome guide sent", details: "Shared membership visit expectations and care instructions.", due_at: null, completed_at: null, created_by: "admin", created_at: timestampFromNow(-6), updated_at: timestampFromNow(-6) },
  { id: "activity-6", user_id: "admin-user-1", customer_name: "Alex Morgan", activity_type: "note", subject: "Coating inspection", details: "Lower rocker panels may need decontamination at the next service.", due_at: null, completed_at: null, created_by: "admin", created_at: timestampFromNow(-24), updated_at: timestampFromNow(-24) },
  { id: "activity-7", user_id: "admin-user-2", customer_name: "Northline Realty", activity_type: "follow_up", subject: "Collect updated vehicle roster", details: "Operations will send the Q3 fleet list.", due_at: timestampFromNow(3), completed_at: null, created_by: "admin", created_at: timestampFromNow(-2), updated_at: timestampFromNow(-2) },
  { id: "activity-8", user_id: "admin-user-3", customer_name: "Jordan Ellis", activity_type: "follow_up", subject: "First visit check-in", details: "Ask about preferred products after the first service.", due_at: timestampFromNow(-3), completed_at: timestampFromNow(-2), created_by: "admin", created_at: timestampFromNow(-7), updated_at: timestampFromNow(-2) }
];

function metricsFor(customers, vehicles, memberships, appointments, activities = []) {
  const billable = memberships.filter((membership) => ["active", "trialing"].includes(membership.status));
  const openFollowUps = activities.filter((activity) => activity.activity_type === "follow_up" && !activity.completed_at);
  const now = Date.now();
  return {
    customers: customers.length,
    members: billable.length,
    vehicles: vehicles.length,
    monthlyRevenue: billable.reduce((sum, membership) => sum + (getPlan(membership.plan_code)?.price || 0) * membership.vehicle_count, 0),
    openAppointments: appointments.filter((appointment) => ["requested", "confirmed", "in_progress"].includes(appointment.status)).length,
    todayAppointments: appointments.filter((appointment) => appointment.preferred_date === dateFromNow(0) && appointment.status !== "cancelled").length,
    openFollowUps: openFollowUps.length,
    dueFollowUps: openFollowUps.filter((activity) => new Date(activity.due_at).getTime() <= now).length
  };
}

export async function getAdminWorkspaceData() {
  if (!hasDatabase()) {
    return {
      preview: true,
      customers: demoCustomers,
      vehicles: demoVehicles,
      memberships: demoMemberships,
      appointments: demoAppointments,
      activities: demoActivities,
      metrics: metricsFor(demoCustomers, demoVehicles, demoMemberships, demoAppointments, demoActivities)
    };
  }

  const [customersResult, vehiclesResult, membershipsResult, appointmentsResult, activitiesResult] = await Promise.all([
    query(
      `SELECT u.id, u.name, u.email, u.phone, u.company_name, u.customer_type,
         u.lifecycle_stage, u.preferred_contact, u.address_line1, u.address_line2,
         u.city, u.state, u.postal_code, u.country, u.tags, u.acquisition_source,
         u.stripe_customer_id, u.admin_notes, u.created_at,
         m.id AS membership_id, m.plan_code, COALESCE(m.vehicle_count, 0)::int AS vehicle_count,
         m.status AS membership_status, COALESCE(m.cancel_at_period_end, FALSE) AS cancel_at_period_end,
         m.current_period_end,
         (SELECT COUNT(*)::int FROM vehicles v WHERE v.user_id = u.id) AS vehicle_total,
         (SELECT MAX(sr.preferred_date) FROM service_requests sr WHERE sr.user_id = u.id AND sr.status = 'completed') AS last_visit_at
       FROM users u
       LEFT JOIN LATERAL (
         SELECT * FROM memberships WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1
       ) m ON TRUE
       WHERE u.role = 'user'
       ORDER BY u.created_at DESC
       LIMIT 250`
    ),
    query(
      `SELECT v.*, u.name AS customer_name, u.email AS customer_email,
         EXISTS (SELECT 1 FROM membership_vehicles mv WHERE mv.vehicle_id = v.id) AS covered
       FROM vehicles v
       JOIN users u ON u.id = v.user_id
       ORDER BY u.name ASC, v.created_at ASC
       LIMIT 500`
    ),
    query(
      `SELECT DISTINCT ON (m.user_id) m.*, u.name AS customer_name, u.email AS customer_email,
         ARRAY(SELECT mv.vehicle_id FROM membership_vehicles mv WHERE mv.membership_id = m.id ORDER BY mv.created_at) AS covered_vehicle_ids
       FROM memberships m
       JOIN users u ON u.id = m.user_id
       ORDER BY m.user_id, m.created_at DESC`
    ),
    query(
      `SELECT sr.*, u.name AS customer_name, u.email AS customer_email,
         v.make, v.model, v.nickname
       FROM service_requests sr
       JOIN users u ON u.id = sr.user_id
       LEFT JOIN vehicles v ON v.id = sr.vehicle_id
       ORDER BY sr.preferred_date DESC NULLS LAST, sr.created_at DESC
       LIMIT 300`
    ),
    query(
      `SELECT ca.*, u.name AS customer_name, u.email AS customer_email
       FROM crm_activities ca
       JOIN users u ON u.id = ca.user_id
       ORDER BY COALESCE(ca.due_at, ca.created_at) DESC, ca.created_at DESC
       LIMIT 500`
    )
  ]);

  const customers = customersResult.rows;
  const vehicles = vehiclesResult.rows;
  const memberships = membershipsResult.rows;
  const appointments = appointmentsResult.rows;
  const activities = activitiesResult.rows;
  return {
    preview: false,
    customers,
    vehicles,
    memberships,
    appointments,
    activities,
    metrics: metricsFor(customers, vehicles, memberships, appointments, activities)
  };
}
