const vehicleTypes = new Set(["daily", "collector", "business"]);

export function normalizeVehicleInput(body = {}) {
  const year = Number(body.year);
  const make = String(body.make || "").trim().slice(0, 80);
  const model = String(body.model || "").trim().slice(0, 80);
  const nickname = String(body.nickname || "").trim().slice(0, 80) || null;
  const color = String(body.color || "").trim().slice(0, 80) || null;
  const vehicleType = vehicleTypes.has(body.vehicleType) ? body.vehicleType : "daily";
  const licensePlate = String(body.licensePlate || "").trim().toUpperCase().slice(0, 16) || null;
  const plateState = String(body.plateState || "").trim().toUpperCase().slice(0, 3) || null;
  const vinLastSix = String(body.vinLastSix || "").trim().toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "").slice(0, 6) || null;
  const serviceNotes = String(body.serviceNotes || "").trim().slice(0, 600) || null;

  if (!Number.isInteger(year) || year < 1900 || year > 2100 || !make || !model) {
    return { error: "Enter a valid year, make, and model." };
  }

  return {
    value: {
      year,
      make,
      model,
      nickname,
      color,
      vehicle_type: vehicleType,
      license_plate: licensePlate,
      plate_state: plateState,
      vin_last_six: vinLastSix,
      service_notes: serviceNotes
    }
  };
}
