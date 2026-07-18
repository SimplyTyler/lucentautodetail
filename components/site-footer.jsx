import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="siteFooter">
      <div className="footerTop">
        <div>
          <Logo />
          <p>Recurring vehicle care for daily drivers, collector garages, and working fleets.</p>
        </div>
        <div className="footerLinks">
          <div>
            <span>Explore</span>
            <Link href="/#memberships">Memberships</Link>
            <Link href="/#collectors">Collector care</Link>
            <Link href="/#fleets">Fleet care</Link>
          </div>
          <div>
            <span>Account</span>
            <Link href="/account">Sign in</Link>
            <Link href="/membership">Build a plan</Link>
            <Link href="/portal">Member portal</Link>
          </div>
          <div>
            <span>Contact</span>
            <a href="mailto:hello@lucentautodetail.com">
              Email Lucent <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
      <div className="footerBottom">
        <span>© {new Date().getFullYear()} Lucent Auto Detail</span>
        <span>Precision care. Consistently.</span>
      </div>
    </footer>
  );
}
