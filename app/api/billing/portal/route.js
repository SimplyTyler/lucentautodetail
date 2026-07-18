import { NextResponse } from "next/server";
import { getCurrentUser, getSession } from "../../../../lib/auth";
import { appUrl, getStripe, hasStripe } from "../../../../lib/stripe";

export async function POST(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!hasStripe()) return NextResponse.json({ error: "Stripe billing is not configured in this preview." }, { status: 503 });

  try {
    const user = await getCurrentUser(session);
    if (!user?.stripe_customer_id) return NextResponse.json({ error: "No Stripe customer is linked to this account yet." }, { status: 404 });
    const portal = await getStripe().billingPortal.sessions.create({ customer: user.stripe_customer_id, return_url: `${appUrl(request)}/portal` });
    return NextResponse.json({ url: portal.url });
  } catch (error) {
    console.error("Billing portal failed", error);
    return NextResponse.json({ error: "Stripe billing portal could not be opened." }, { status: 500 });
  }
}
