export const membershipPlans = [
  {
    code: "drive",
    name: "Drive",
    audience: "Daily drivers",
    description: "A dependable monthly reset that keeps your primary vehicle sharp without the weekend chore.",
    price: 119,
    visits: "1 visit / month",
    minVehicles: 1,
    maxVehicles: 4,
    accent: "lime",
    features: ["Paint-safe exterior wash", "Wheels, tires, and glass", "Cabin vacuum and wipe-down", "Monthly condition notes"]
  },
  {
    code: "reserve",
    name: "Reserve",
    audience: "Exotic + collector",
    description: "Low-volume, high-touch care for special paint, delicate finishes, and cars that live indoors.",
    price: 249,
    visits: "1 concierge visit / month",
    minVehicles: 1,
    maxVehicles: 6,
    accent: "orange",
    features: ["Finish-specific wash process", "Full interior maintenance", "Quarterly protection refresh", "Priority scheduling and records"]
  },
  {
    code: "fleet",
    name: "Fleet",
    audience: "Business vehicles",
    description: "Predictable presentation across every customer-facing vehicle, coordinated around your operation.",
    price: 79,
    visits: "1 service / vehicle / month",
    minVehicles: 5,
    maxVehicles: 50,
    accent: "ice",
    features: ["On-site grouped service", "Exterior and cabin reset", "Vehicle-level service log", "Centralized business billing"]
  }
];

export function getPlan(code) {
  return membershipPlans.find((plan) => plan.code === code);
}

export function formatMoney(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(amount);
}
