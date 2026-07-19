import { AdminAppointmentWorkspace } from "../../../components/admin-appointment-workspace";
import { getAdminWorkspaceData } from "../../../lib/admin-data";

export const metadata = { title: "Appointments | Admin" };

export default async function AdminAppointmentsPage({ searchParams }) {
  const params = await searchParams;
  const data = await getAdminWorkspaceData();
  return <AdminAppointmentWorkspace initialAppointments={data.appointments} customers={data.customers} vehicles={data.vehicles} initialCustomerId={params?.customer} initialStatus={params?.status} openNew={params?.new === "1"} preview={data.preview} />;
}
