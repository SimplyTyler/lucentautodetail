import { VehicleManager } from "../../../components/vehicle-manager";
import { getPortalData } from "../../../lib/data";
import { getPortalContext } from "../../../lib/portal";

export const metadata = { title: "Vehicles" };

export default async function VehiclesPage() {
  const { user } = await getPortalContext("/portal/vehicles");
  const data = await getPortalData(user);

  return (
    <>
      {data.preview && <div className="portalNotice">Preview garage data is active. Add, edit, and remove flows are available without affecting production records.</div>}
      <VehicleManager initialVehicles={data.vehicles} coveredVehicleIds={data.coveredVehicleIds} preview={data.preview} />
    </>
  );
}
