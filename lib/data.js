import { hasDatabase, query } from "./db";
import { getPlan } from "./plans";

const demoVehicles = [
  { id: "demo-vehicle-1", year: 2024, make: "Porsche", model: "911 GT3", nickname: "Graphite", color: "Agate grey", vehicle_type: "collector" },
  { id: "demo-vehicle-2", year: 2023, make: "Range Rover", model: "Sport", nickname: "Daily", color: "Santorini black", vehicle_type: "daily" }
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
        current_period_end: new Date(Date.now() + 21 * 86400000).toISOString()
      },
      requests: [
        { id: "demo-request", preferred_date: new Date(Date.now() + 6 * 86400000).toISOString(), status: "confirmed", make: "Porsche", model: "911 GT3" }
      ]
    };
  }

  const [vehicles, memberships, requests] = await Promise.all([
    query("SELECT * FROM vehicles WHERE user_id = $1 ORDER BY created_at ASC", [user.id]),
    query("SELECT * FROM memberships WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1", [user.id]),
    query(
      `SELECT sr.*, v.make, v.model
       FROM service_requests sr
       LEFT JOIN vehicles v ON v.id = sr.vehicle_id
       WHERE sr.user_id = $1
       ORDER BY sr.created_at DESC
       LIMIT 8`,
      [user.id]
    )
  ]);

  return {
    preview: false,
    vehicles: vehicles.rows,
    membership: memberships.rows[0] || null,
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
