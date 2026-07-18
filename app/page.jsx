import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  Building2,
  CalendarCheck,
  CarFront,
  Check,
  ClipboardCheck,
  Gauge,
  KeyRound,
  Layers3,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { MembershipConfigurator } from "../components/membership-configurator";
import { Reveal } from "../components/reveal";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";

const process = [
  { number: "01", icon: CarFront, title: "Build your garage", text: "Create an account and add each daily, collector, or business vehicle." },
  { number: "02", icon: Layers3, title: "Choose the care level", text: "One clear monthly rate per vehicle, matched to how each one is used." },
  { number: "03", icon: CalendarCheck, title: "Set the rhythm", text: "Request service windows from your portal and keep every visit organized." },
  { number: "04", icon: ClipboardCheck, title: "Track every finish", text: "See vehicles, membership status, visit history, and billing in one place." }
];

export default function Home() {
  return (
    <main>
      <section className="homeHero">
        <Image className="homeHeroImage" src="/lucent-hero-v2.jpg" alt="Graphite exotic coupe inside a precision detailing studio" fill priority sizes="100vw" />
        <div className="homeHeroOverlay" />
        <SiteHeader />
        <div className="homeHeroInner">
          <div className="heroCopyNew">
            <span className="heroBadge"><Sparkles size={15} aria-hidden="true" /> Membership auto detailing</span>
            <h1>Lucent auto care, on repeat.</h1>
            <p>Precision detailing for the cars you love and the vehicles your business depends on, managed by the month.</p>
            <div className="heroButtons">
              <Link className="button buttonLime" href="/membership">Build your plan <ArrowRight size={18} aria-hidden="true" /></Link>
              <Link className="button buttonGlass" href="/account?mode=signup">Create an account</Link>
            </div>
          </div>
          <div className="heroSpecRail" aria-label="Membership benefits">
            <div><Gauge size={19} /><span>Monthly care</span><strong>Built around usage</strong></div>
            <div><ShieldCheck size={19} /><span>Finish first</span><strong>Process documented</strong></div>
            <div><KeyRound size={19} /><span>One portal</span><strong>Garage + billing</strong></div>
          </div>
        </div>
        <a className="heroScroll" href="#memberships" aria-label="Explore memberships"><ArrowDown size={18} /></a>
      </section>

      <section className="statementBand">
        <p>Not another wash club.</p>
        <h2>Detail-level care with a schedule that actually keeps up.</h2>
      </section>

      <section className="sectionShell membershipsSection" id="memberships">
        <Reveal className="sectionIntro">
          <span className="kicker">Memberships</span>
          <h2>One vehicle or fifty. Give each one the right level of care.</h2>
          <p>Choose a plan, set the vehicle count, and see the monthly total before opening secure Stripe checkout.</p>
        </Reveal>
        <Reveal delay={120}><MembershipConfigurator compact /></Reveal>
      </section>

      <section className="collectorFeature" id="collectors">
        <div className="collectorImage" role="img" aria-label="Collector car in a clean detailing bay" />
        <Reveal className="collectorCopy">
          <span className="kicker kickerOrange">For collector garages</span>
          <h2>Delicate finishes deserve a consistent hand.</h2>
          <p>Reserve care is built for low-mileage, high-attention vehicles. Wash chemistry, tools, and protection are matched to the finish, with notes kept against the vehicle.</p>
          <ul className="featureTicks">
            <li><Check size={17} /> Finish-specific service</li>
            <li><Check size={17} /> Priority scheduling</li>
            <li><Check size={17} /> Quarterly protection refresh</li>
          </ul>
          <Link className="textLink" href="/membership?plan=reserve">Explore Reserve <ArrowRight size={17} /></Link>
        </Reveal>
      </section>

      <section className="fleetFeature" id="fleets">
        <Image src="/lucent-fleet-v2.jpg" alt="A coordinated group of clean business vehicles outside a detailing facility" fill sizes="100vw" />
        <div className="fleetOverlay" />
        <Reveal className="fleetCopy">
          <span className="kicker kickerIce"><Building2 size={15} /> For business fleets</span>
          <h2>Every vehicle arrives looking like it belongs to the same company.</h2>
          <p>Group service windows, per-vehicle records, and centralized billing keep fleet presentation sharp without turning it into another operations project.</p>
          <Link className="button buttonLight" href="/membership?plan=fleet">Build a fleet plan <ArrowRight size={18} /></Link>
        </Reveal>
        <div className="fleetStats">
          <div><strong>5–50</strong><span>vehicles per plan</span></div>
          <div><strong>1×</strong><span>monthly service</span></div>
          <div><strong>1</strong><span>consolidated account</span></div>
        </div>
      </section>

      <section className="sectionShell processSection" id="process">
        <Reveal className="sectionIntro processIntro">
          <span className="kicker">How it works</span>
          <h2>From signup to spotless, without the back-and-forth.</h2>
        </Reveal>
        <div className="processGrid">
          {process.map(({ number, icon: Icon, title, text }, index) => (
            <Reveal className="processStep" delay={index * 80} key={number}>
              <span>{number}</span><Icon size={22} aria-hidden="true" /><h3>{title}</h3><p>{text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="portalPreviewBand">
        <Reveal className="portalPreviewCopy">
          <span className="kicker">Member portal</span>
          <h2>Your whole garage, in view.</h2>
          <p>Add vehicles, request the next service, see membership status, and open Stripe billing from a dashboard designed for quick decisions.</p>
          <Link className="button buttonLime" href="/account?mode=signup">Create your account <ArrowRight size={18} /></Link>
        </Reveal>
        <Reveal className="portalMock" delay={120}>
          <div className="portalMockTop"><span /><strong>Good morning, Alex</strong><small>Reserve member</small></div>
          <div className="portalMockMetrics"><span><small>Vehicles</small><strong>02</strong></span><span><small>Next visit</small><strong>Jul 24</strong></span><span><small>Plan</small><strong>Active</strong></span></div>
          <div className="portalMockRows">
            <div><CarFront size={19} /><span><strong>2024 Porsche 911 GT3</strong><small>Collector · Graphite</small></span><i>Ready</i></div>
            <div><CarFront size={19} /><span><strong>2023 Range Rover Sport</strong><small>Daily · Santorini black</small></span><i>Ready</i></div>
          </div>
        </Reveal>
      </section>

      <section className="closingCta">
        <span>Precision care. Consistently.</span>
        <h2>Put your vehicles on a better schedule.</h2>
        <div><Link className="button buttonDark" href="/membership">Build your plan <ArrowRight size={18} /></Link><Link className="textLink" href="/account">Member sign in</Link></div>
      </section>
      <SiteFooter />
    </main>
  );
}
