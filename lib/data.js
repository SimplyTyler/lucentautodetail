import { hasDatabase, query } from "./db";
import { getPlan } from "./plans";

const demoVehicles = [
  { id: "demo-vehicle-1", year: 2024, make: "Porsche", model: "911 GT3", nickname: "Graphite", color: "Agate grey", vehicle_type: "collector", license_plate: "LUCENT1", plate_state: "AZ", vin_last_six: "1842GT", service_notes: "Ceramic coating applied. Use pH-neutral wash chemistry." },
  { id: "demo-vehicle-2", year: 2023, make: "Range Rover", model: "Sport", nickname: "Daily", color: "Santorini black", vehicle_type: "daily", license_plate: "DAILY23", plate_state: "AZ", vin_last_six: "90RRS2", service_notes: "Focus on rear-seat touch points and cargo area." }
];

const dayFromNow = (days) => new Date(Date.now() + days * 86400000).toISOString();

const demoRequests = [
  { id: "demo-request-1", vehicle_id: "demo-vehicle-1", preferred_date: dayFromNow(6), preferred_window: "morning", service_type: "membership_detail", service_location: "home", service_address: "2140 E Camelback Rd, Phoenix, AZ", notes: "Please use the side gate.", status: "confirmed", make: "Porsche", model: "911 GT3", nickname: "Graphite" },
  { id: "demo-request-2", vehicle_id: "demo-vehicle-2", preferred_date: dayFromNow(24), preferred_window: "afternoon", service_type: "interior_focus", service_location: "office", service_address: "100 N Central Ave, Phoenix, AZ", notes: null, status: "requested", make: "Range Rover", model: "Sport", nickname: "Daily" },
  { id: "demo-request-3", vehicle_id: "demo-vehicle-1", preferred_date: dayFromNow(-25), preferred_window: "morning", service_type: "protection_refresh", service_location: "studio", service_address: null, notes: null, status: "completed", make: "Porsche", model: "911 GT3", nickname: "Graphite" }
];

export async function getPortalData(user) {
  if (!hasDatabase() || user?.preview) {
    return {
      preview: true,
      vehicles: demoVehicles,
      membership: {
        id: "demo-membership",
        plan_code: "reserve",
        status: "active",
        vehicle_count: 2,
        cancel_at_period_end: false,
        current_period_end: new Date(Date.now() + 21 * 86400000).toISOString()
      },
      coveredVehicleIds: demoVehicles.map((vehicle) => vehicle.id),
      requests: demoRequests
    };
  }

  const [vehicles, memberships, requests] = await Promise.all([
    query("SELECT * FROM vehicles WHERE user_id = $1 ORDER BY created_at ASC", [user.id]),
    query("SELECT * FROM memberships WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1", [user.id]),
    query(
      `SELECT sr.*, v.make, v.model, v.nickname
       FROM service_requests sr
       LEFT JOIN vehicles v ON v.id = sr.vehicle_id
       WHERE sr.user_id = $1
       ORDER BY sr.preferred_date DESC NULLS LAST, sr.created_at DESC
       LIMIT 30`,
      [user.id]
    )
  ]);

  const membership = memberships.rows[0] || null;
  const coveredVehicles = membership
    ? await query("SELECT vehicle_id FROM membership_vehicles WHERE membership_id = $1 AND user_id = $2", [membership.id, user.id])
    : { rows: [] };

  return {
    preview: false,
    vehicles: vehicles.rows,
    membership,
    coveredVehicleIds: coveredVehicles.rows.map((row) => row.vehicle_id),
    requests: requests.rows
  };
}

export async function getAdminData() {
  if (!hasDatabase()) {
    const demoMembers = [
      { id: "1", name: "Alex Morgan", email: "alex@example.com", plan_code: "reserve", vehicle_count: 2, status: "active", created_at: new Date(Date.now() - 70 * 86400000).toISOString() },
      { id: "2", name: "Northline Realty", email: "ops@northline.example", plan_code: "fleet", vehicle_count: 12, status: "active", created_at: new Date(Date.now() - 46 * 86400000).toISOString() },
      { id: "3", name: "Jordan Ellis", email: "jordan@example.com", plan_code: "drive", vehicle_count: 1, status: "trialing", created_at: new Date(Date.now() - 8 * 86400000).toISOString() },
      { id: "4", name: "Summit Executive", email: "fleet@summit.example", plan_code: "fleet", vehicle_count: 7, status: "past_due", created_at: new Date(Date.now() - 120 * 86400000).toISOString() }
    ];
    return {
      preview: true,
      metrics: { members: 28, vehicles: 64, monthlyRevenue: 7564, openRequests: 9 },
      members: demoMembers,
      requests: [
        { id: "r1", name: "Alex Morgan", make: "Porsche", model: "911 GT3", preferred_date: new Date(Date.now() + 6 * 86400000).toISOString(), status: "confirmed" },
        { id: "r2", name: "Northline Realty", make: "Ford", model: "Transit", preferred_date: new Date(Date.now() + 2 * 86400000).toISOString(), status: "requested" }
      ]
    };
  }

  const [memberCount, vehicleCount, requestCount, members, requests, activeMemberships] = await Promise.all([
    query("SELECT COUNT(*)::int AS count FROM memberships WHERE status IN ('active', 'trialing')"),
    query("SELECT COALESCE(SUM(vehicle_count), 0)::int AS count FROM memberships WHERE status IN ('active', 'trialing')"),
    query("SELECT COUNT(*)::int AS count FROM service_requests WHERE status IN ('requested', 'confirmed')"),
    query(
      `SELECT u.id, u.name, u.email, u.created_at, m.plan_code, m.vehicle_count, m.status
       FROM users u
       LEFT JOIN LATERAL (
         SELECT plan_code, vehicle_count, status FROM memberships
         WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1
       ) m ON true
       ORDER BY u.created_at DESC LIMIT 50`
    ),
    query(
      `SELECT sr.id, sr.preferred_date, sr.status, u.name, v.make, v.model
       FROM service_requests sr
       JOIN users u ON u.id = sr.user_id
       LEFT JOIN vehicles v ON v.id = sr.vehicle_id
       WHERE sr.status IN ('requested', 'confirmed')
       ORDER BY sr.preferred_date ASC NULLS LAST LIMIT 12`
    ),
    query("SELECT plan_code, vehicle_count, status FROM memberships WHERE status IN ('active', 'trialing')")
  ]);

  const monthlyRevenue = activeMemberships.rows.reduce((sum, member) => {
    const plan = getPlan(member.plan_code);
    return sum + (plan && ["active", "trialing"].includes(member.status) ? plan.price * member.vehicle_count : 0);
  }, 0);

  return {
    preview: false,
    metrics: {
      members: memberCount.rows[0].count,
      vehicles: vehicleCount.rows[0].count,
      monthlyRevenue,
      openRequests: requestCount.rows[0].count
    },
    members: members.rows,
    requests: requests.rows
  };
}
