import { AdminVehicleWorkspace } from "../../../components/admin-vehicle-workspace";
import { getAdminWorkspaceData } from "../../../lib/admin-data";

export const metadata = { title: "Vehicles | Admin" };

export default async function AdminVehiclesPage({ searchParams }) {
  const params = await searchParams;
  const data = await getAdminWorkspaceData();
  return <AdminVehicleWorkspace initialVehicles={data.vehicles} customers={data.customers} initialCustomerId={params?.customer} initialVehicleId={params?.vehicle} openNew={params?.new === "1"} preview={data.preview} />;
}
