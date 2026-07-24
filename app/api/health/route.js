import { hasDatabase } from "../../../lib/db";
import { hasStripe } from "../../../lib/stripe";

export function GET() {
  return Response.json({ ok: true, databaseConfigured: hasDatabase(), stripeConfigured: hasStripe() });
}
