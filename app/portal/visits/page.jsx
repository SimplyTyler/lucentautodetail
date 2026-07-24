import { VisitWorkspace } from "../../../components/visit-workspace";
import { getPortalData } from "../../../lib/data";
import { getPortalContext } from "../../../lib/portal";

export const metadata = { title: "Visits" };

export default async function VisitsPage() {
  const { user } = await getPortalContext("/portal/visits");
  const data = await getPortalData(user);

  return (
    <>
      {data.preview && <div className="portalNotice">Preview scheduling is active. Requests, rescheduling, and cancellations are simulated locally.</div>}
      <VisitWorkspace vehicles={data.vehicles} initialRequests={data.requests} preview={data.preview} />
    </>
  );
}
