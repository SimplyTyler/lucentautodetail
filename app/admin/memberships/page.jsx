import { AdminMembershipWorkspace } from "../../../components/admin-membership-workspace";
import { getAdminWorkspaceData } from "../../../lib/admin-data";

export const metadata = { title: "Memberships | Admin" };

export default async function AdminMembershipsPage({ searchParams }) {
  const params = await searchParams;
  const data = await getAdminWorkspaceData();
  return <AdminMembershipWorkspace initialMemberships={data.memberships} customers={data.customers} vehicles={data.vehicles} initialMembershipId={params?.membership} initialStatus={params?.status} preview={data.preview} />;
}
