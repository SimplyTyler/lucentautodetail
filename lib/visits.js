export const visitServices = [
  { code: "membership_detail", name: "Membership detail", duration: "2-3 hours" },
  { code: "exterior_reset", name: "Exterior reset", duration: "90 minutes" },
  { code: "interior_focus", name: "Interior focus", duration: "90 minutes" },
  { code: "protection_refresh", name: "Protection refresh", duration: "3-4 hours" }
];

export const visitWindows = [
  { code: "morning", name: "Morning", detail: "8 AM - 11 AM" },
  { code: "midday", name: "Midday", detail: "11 AM - 2 PM" },
  { code: "afternoon", name: "Afternoon", detail: "2 PM - 5 PM" }
];

export const visitLocations = [
  { code: "home", name: "Home" },
  { code: "office", name: "Office" },
  { code: "studio", name: "Lucent studio" }
];

const serviceCodes = new Set(visitServices.map((item) => item.code));
const windowCodes = new Set(visitWindows.map((item) => item.code));
const locationCodes = new Set(visitLocations.map((item) => item.code));

function isCalendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function currentBusinessDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: process.env.BUSINESS_TIME_ZONE || "America/Phoenix",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function normalizeVisitInput(body = {}, options = {}) {
  const vehicleId = String(body.vehicleId || "").trim();
  const preferredDate = String(body.preferredDate || "").trim();
  const preferredWindow = windowCodes.has(body.preferredWindow) ? body.preferredWindow : "morning";
  const serviceType = serviceCodes.has(body.serviceType) ? body.serviceType : "membership_detail";
  const serviceLocation = locationCodes.has(body.serviceLocation) ? body.serviceLocation : "home";
  const serviceAddress = String(body.serviceAddress || "").trim().slice(0, 240) || null;
  const notes = String(body.notes || "").trim().slice(0, 1000) || null;

  if (!vehicleId || !isCalendarDate(preferredDate)) {
    return { error: "Choose a vehicle and preferred date." };
  }
  if (!options.allowPast && preferredDate < currentBusinessDate()) return { error: "Choose today or a future service date." };
  if (serviceLocation !== "studio" && !serviceAddress) {
    return { error: "Enter the address where the vehicle will be serviced." };
  }

  return {
    value: {
      vehicle_id: vehicleId,
      preferred_date: preferredDate,
      preferred_window: preferredWindow,
      service_type: serviceType,
      service_location: serviceLocation,
      service_address: serviceAddress,
      notes
    }
  };
}
