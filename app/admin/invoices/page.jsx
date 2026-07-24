import { AdminInvoiceWorkspace } from "../../../components/admin-invoice-workspace";
import { getAdminWorkspaceData } from "../../../lib/admin-data";
import { getAdminInvoiceData } from "../../../lib/invoices";

export const metadata = { title: "Invoices | Admin" };

export default async function AdminInvoicesPage({ searchParams }) {
  const params = await searchParams;
  const data = await getAdminWorkspaceData();
  const invoiceData = await getAdminInvoiceData(data.customers);
  return (
    <AdminInvoiceWorkspace
      initialInvoices={invoiceData.invoices}
      customers={data.customers}
      vehicles={data.vehicles}
      initialInvoiceId={params?.invoice}
      initialCustomerId={params?.customer}
      initialVehicleId={params?.vehicle}
      initialFilter={params?.status}
      startNew={params?.new === "1"}
      preview={invoiceData.preview}
      configured={invoiceData.configured}
      loadError={invoiceData.error}
    />
  );
}
