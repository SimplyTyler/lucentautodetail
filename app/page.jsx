import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  Droplets,
  Gauge,
  Gem,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  SprayCan,
  Timer
} from "lucide-react";

const services = [
  {
    icon: Sparkles,
    title: "Signature Detail",
    text: "A balanced reset for paint, wheels, glass, trim, cabin surfaces, and finishing protection."
  },
  {
    icon: ShieldCheck,
    title: "Ceramic Protection",
    text: "Durable hydrophobic protection for gloss retention, easier washes, and stronger daily defense."
  },
  {
    icon: SprayCan,
    title: "Interior Revival",
    text: "Deep cleaning for carpets, mats, leather, vinyl, vents, cup holders, glass, and odor-prone areas."
  },
  {
    icon: Droplets,
    title: "Maintenance Wash",
    text: "A careful upkeep service for vehicles already corrected, coated, or regularly maintained."
  }
];

const packages = [
  {
    name: "Refresh",
    price: "From $149",
    detail: "For clean vehicles that need a crisp reset.",
    items: ["Foam hand wash", "Wheel and tire detail", "Interior wipe-down", "Glass and final gloss"]
  },
  {
    name: "Lucent",
    price: "From $299",
    detail: "The core full detail for daily drivers.",
    items: ["Decontamination wash", "Light paint enhancement", "Deep interior clean", "SiO2 sealant finish"]
  },
  {
    name: "Shield",
    price: "Custom quote",
    detail: "For correction, coating, and long-term protection.",
    items: ["Paint inspection", "Machine polishing", "Ceramic coating options", "Aftercare plan"]
  }
];

const proof = [
  ["8+", "detail steps per visit"],
  ["100%", "hand-finished inspection"],
  ["24 hr", "quote response target"]
];

export default function Home() {
  return (
    <main>
      <section className="hero" id="top">
        <nav className="nav" aria-label="Primary navigation">
          <a className="brand" href="#top" aria-label="Lucent Auto Detail home">
            <span className="brandMark">L</span>
            <span>Lucent Auto Detail</span>
          </a>
          <div className="navLinks">
            <a href="#services">Services</a>
            <a href="#packages">Packages</a>
            <a href="#quote">Quote</a>
          </div>
        </nav>

        <div className="heroGrid">
          <div className="heroCopy">
            <p className="eyebrow">Premium auto detailing</p>
            <h1>
              <span>Lucent</span>
              <span>Auto</span>
              <span>Detail</span>
            </h1>
            <p className="heroLead">
              Gloss-focused detailing for drivers who want careful paintwork, spotless interiors, and protection
              that keeps the finish easy to love.
            </p>
            <div className="heroActions">
              <a className="primaryButton" href="#quote">
                Request a quote <ArrowRight size={18} aria-hidden="true" />
              </a>
              <a className="ghostButton" href="#packages">
                View packages
              </a>
            </div>
          </div>

          <div className="heroPanel" aria-label="Detailing highlights">
            <div>
              <Gauge size={20} aria-hidden="true" />
              <span>Paint-safe process</span>
            </div>
            <div>
              <Gem size={20} aria-hidden="true" />
              <span>High-gloss finish</span>
            </div>
            <div>
              <Timer size={20} aria-hidden="true" />
              <span>Maintenance plans</span>
            </div>
          </div>
        </div>
      </section>

      <section className="proofStrip" aria-label="Lucent service proof points">
        {proof.map(([value, label]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </section>

      <section className="section services" id="services">
        <div className="sectionHeader">
          <p className="eyebrow">Services</p>
          <h2>Everything your vehicle needs to feel newly finished.</h2>
        </div>
        <div className="serviceGrid">
          {services.map(({ icon: Icon, title, text }) => (
            <article className="serviceCard" key={title}>
              <Icon size={28} aria-hidden="true" />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="featureBand">
        <div className="featureImage" aria-label="Freshly detailed vehicle finish" />
        <div className="featureCopy">
          <p className="eyebrow">The Lucent standard</p>
          <h2>Clean work, clear expectations, and a finish that holds attention.</h2>
          <p>
            Every service is built around inspection, safe-contact washing, targeted correction, and the right
            protection for how the vehicle is actually driven.
          </p>
          <ul>
            <li>
              <BadgeCheck size={19} aria-hidden="true" />
              Paint, wheels, glass, trim, and interior surfaces reviewed before delivery.
            </li>
            <li>
              <BadgeCheck size={19} aria-hidden="true" />
              Package recommendations are matched to the vehicle condition, not a one-size menu.
            </li>
          </ul>
        </div>
      </section>

      <section className="section packages" id="packages">
        <div className="sectionHeader">
          <p className="eyebrow">Packages</p>
          <h2>Start with the right level of care.</h2>
        </div>
        <div className="packageGrid">
          {packages.map((pkg) => (
            <article className="packageCard" key={pkg.name}>
              <div>
                <h3>{pkg.name}</h3>
                <strong>{pkg.price}</strong>
                <p>{pkg.detail}</p>
              </div>
              <ul>
                {pkg.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="quoteBand" id="quote">
        <div className="quoteCopy">
          <p className="eyebrow">Book</p>
          <h2>Tell Lucent what you drive.</h2>
          <p>
            Send the vehicle year, make, model, condition, and the service you have in mind. Photos help shape the
            most accurate quote.
          </p>
          <div className="contactRows">
            <a href="tel:+10000000000">
              <Phone size={18} aria-hidden="true" />
              <span>Add your phone number</span>
            </a>
            <a href="mailto:hello@lucentautodetail.com">
              <CalendarCheck size={18} aria-hidden="true" />
              <span>hello@lucentautodetail.com</span>
            </a>
            <span>
              <MapPin size={18} aria-hidden="true" />
              <span>Service area ready to customize</span>
            </span>
          </div>
        </div>
        <form className="quoteForm" action="mailto:hello@lucentautodetail.com" method="post" encType="text/plain">
          <label>
            Name
            <input type="text" name="name" placeholder="Your name" />
          </label>
          <label>
            Vehicle
            <input type="text" name="vehicle" placeholder="Year, make, model" />
          </label>
          <label>
            Service
            <select name="service" defaultValue="">
              <option value="" disabled>
                Choose a package
              </option>
              <option>Refresh</option>
              <option>Lucent</option>
              <option>Shield</option>
              <option>Not sure yet</option>
            </select>
          </label>
          <label>
            Notes
            <textarea name="notes" placeholder="Paint condition, interior needs, coating goals" rows="4" />
          </label>
          <button type="submit">
            Prepare quote <ArrowRight size={18} aria-hidden="true" />
          </button>
        </form>
      </section>
    </main>
  );
}
