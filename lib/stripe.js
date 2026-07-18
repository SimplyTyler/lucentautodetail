import Stripe from "stripe";

let stripeClient;

export function hasStripe() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe() {
  if (!hasStripe()) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

export function appUrl(request) {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  const origin = request?.headers?.get("origin");
  if (origin) {
    return origin;
  }
  if (process.env.RENDER_EXTERNAL_HOSTNAME) {
    return `https://${process.env.RENDER_EXTERNAL_HOSTNAME}`;
  }
  return "http://localhost:3000";
}
