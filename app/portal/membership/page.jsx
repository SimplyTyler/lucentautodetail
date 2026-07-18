import { CheckCircle2, Info } from "lucide-react";
import { MembershipManager } from "../../../components/membership-manager";
import { getPortalData } from "../../../lib/data";
import { getPortalContext } from "../../../lib/portal";

export const metadata = { title: "Membership" };

export default async function MembershipPage({ searchParams }) {
  const { user } = await getPortalContext("/portal/membership");
  const data = await getPortalData(user);
  const params = await searchParams;

  return (
    <>
      {data.preview && <div className="portalNotice">Preview membership controls are active. Stripe changes are simulated until billing is connected.</div>}
      {params?.checkout === "success" && <div className="successBanner"><CheckCircle2 size={18} /> Subscription received. Stripe is confirming the membership now.</div>}
      {params?.checkout === "cancelled" && <div className="portalInfoBanner"><Info size={18} /> Checkout was closed. Your membership was not changed.</div>}
      <MembershipManager initialMembership={data.membership} vehicles={data.vehicles} initialCoveredVehicleIds={data.coveredVehicleIds} preview={data.preview} />
    </>
  );
}
