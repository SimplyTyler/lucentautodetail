import { AdminCustomerWorkspace } from "../../../components/admin-customer-workspace";
import { getAdminWorkspaceData } from "../../../lib/admin-data";

export const metadata = { title: "Customers | Admin" };

export default async function AdminCustomersPage({ searchParams }) {
  const params = await searchParams;
  const data = await getAdminWorkspaceData();
  return <AdminCustomerWorkspace initialCustomers={data.customers} vehicles={data.vehicles} appointments={data.appointments} initialCustomerId={params?.customer} initialFilter={params?.status} preview={data.preview} />;
}
