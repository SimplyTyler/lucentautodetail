import { AdminCustomerWorkspace } from "../../../components/admin-customer-workspace";
import { getAdminWorkspaceData } from "../../../lib/admin-data";
import { getAdminInvoiceData } from "../../../lib/invoices";

export const metadata = { title: "Customers | Admin" };

export default async function AdminCustomersPage({ searchParams }) {
  const params = await searchParams;
  const data = await getAdminWorkspaceData();
  const invoiceData = await getAdminInvoiceData(data.customers);
  return (
    <AdminCustomerWorkspace
      initialCustomers={data.customers}
      vehicles={data.vehicles}
      appointments={data.appointments}
      initialActivities={data.activities}
      invoices={invoiceData.invoices}
      initialCustomerId={params?.customer}
      initialFilter={params?.status}
      preview={data.preview}
    />
  );
}
