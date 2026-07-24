import { ArrowLeft, Check, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { MembershipConfigurator } from "../../components/membership-configurator";
import { SiteFooter } from "../../components/site-footer";
import { SiteHeader } from "../../components/site-header";
import { getPlan } from "../../lib/plans";

export const metadata = { title: "Memberships" };

export default async function MembershipPage({ searchParams }) {
  const params = await searchParams;
  const initialPlan = getPlan(params?.plan) ? params.plan : "drive";

  return (
    <main className="lightPage">
      <SiteHeader tone="light" />
      <section className="membershipHero">
        <Link className="backLink" href="/"><ArrowLeft size={16} /> Back to Lucent</Link>
        <span className="kicker">Build a membership</span>
        <h1>Care that scales with your garage.</h1>
        <p>Select the service level and number of vehicles. Your account keeps the garage organized; Stripe handles recurring billing securely.</p>
        <div className="trustLine"><span><Check size={15} /> Per-vehicle pricing</span><span><Check size={15} /> Monthly billing</span><span><ShieldCheck size={15} /> Stripe checkout</span></div>
      </section>
      <section className="membershipBuilderPage"><MembershipConfigurator initialPlan={initialPlan} /></section>
      <section className="membershipFinePrint">
        <strong>Before the first visit</strong>
        <p>Lucent confirms vehicle condition, service address, access, and the best recurring window. Oversized vehicles, severe-condition recovery, correction, and coating work may be quoted separately.</p>
      </section>
      <SiteFooter />
    </main>
  );
}
