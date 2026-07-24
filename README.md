# Lucent Auto Detail

Full-stack Next.js membership and CRM platform for recurring auto detailing. It includes a public plan builder, account creation and login, a member garage and service-request portal, customer relationship management, Stripe subscriptions and invoicing, PostgreSQL persistence, and Render infrastructure configuration.

## Product Surfaces

- `/` modern marketing site for daily drivers, collector cars, and business fleets
- `/membership` per-vehicle plan configurator with live monthly totals
- `/account` account creation and sign in
- `/portal` member vehicles, visits, plan status, and Stripe billing access
- `/admin` live operations dashboard with schedule, billing, and account alerts
- `/admin/customers` editable customer and billing profiles, lifecycle stages, tags, relationship activity, follow-ups, vehicles, invoices, and service history
- `/admin/appointments` create, assign, reschedule, progress, complete, and cancel appointments
- `/admin/invoices` create itemized Stripe invoices, save drafts, send or resend hosted payment pages, download PDFs, void open invoices, and delete drafts
- `/admin/memberships` change plans and care slots, assign vehicles, sync Stripe, cancel, or resume
- `/admin/vehicles` add, edit, search, and remove vehicles across customer accounts
- `/api/webhooks/stripe` subscription lifecycle synchronization
- `/api/health` Render health check

## Local Development

```bash
npm install
npm run dev
```

Without environment variables, the app runs in preview mode. Account actions open a demo portal and no data leaves the local app.

For persistent local data, copy `.env.example` to `.env.local`, create a PostgreSQL database, and run:

```bash
npm run db:migrate
npm run dev
```

## Stripe Setup

Add these values to `.env.local` or the Render service environment:

```text
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

In the Stripe Dashboard:

1. Configure the customer portal for subscription cancellation, payment-method updates, invoices, and any quantity changes you want members to manage.
2. Configure your business identity, invoice branding, support contact, and customer email settings under Stripe Invoicing.
3. Add a webhook endpoint at `https://YOUR_DOMAIN/api/webhooks/stripe`.
4. Subscribe it to `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`.
5. Test subscriptions and invoice emails with Stripe sandbox keys before replacing them with live-mode keys.

Checkout uses recurring `price_data`, so the plan amounts in `lib/plans.js` are the source of truth. Each Stripe line-item quantity equals the number of vehicles on the membership.

The app uses Stripe-hosted Checkout, the customer portal, and hosted invoice pages, so a publishable key is not required. Invoice status is read directly from Stripe whenever the CRM loads; invoice webhook events are not required for the current implementation.

## Admin Access

Set `ADMIN_EMAILS` to a comma-separated allowlist:

```text
ADMIN_EMAILS=owner@lucentautodetail.com,manager@lucentautodetail.com
```

Accounts created with an allowlisted email receive admin access. Existing sessions should sign out and back in after the allowlist changes.

The admin console is backed by the same PostgreSQL records, Stripe customers, subscriptions, and invoices as the member portal. Customer billing identity changes are synchronized to Stripe when a customer is already linked. Without database credentials it opens in a read-safe preview with simulated mutations, which is useful for interface review but does not persist changes or send email.

## Render Deployment

`render.yaml` creates:

- a Next.js web service
- a Render PostgreSQL database
- an automatically generated session secret
- secure prompts for Stripe keys and the admin allowlist
- an idempotent database migration on startup

Create or sync the Blueprint here:

```text
https://dashboard.render.com/blueprint/new?repo=https://github.com/SimplyTyler/lucentautodetail
```

The free database plan is useful for evaluation. Move the database and web service to production-grade plans before accepting live customer subscriptions.

## Production Check

```bash
npm run build
npm start
```

The generated automotive imagery lives in `public/lucent-hero-v2.jpg` and `public/lucent-fleet-v2.jpg`.
