"use client";

import Link from "next/link";
import { Menu, UserRound, X } from "lucide-react";
import { useState } from "react";
import { Logo } from "./logo";

const links = [
  ["Memberships", "/#memberships"],
  ["Collectors", "/#collectors"],
  ["Fleets", "/#fleets"],
  ["How it works", "/#process"]
];

export function SiteHeader({ tone = "dark" }) {
  const [open, setOpen] = useState(false);

  return (
    <header className={`siteHeader siteHeader${tone === "light" ? "Light" : "Dark"}`}>
      <div className="siteHeaderInner">
        <Logo />
        <nav className={`siteNav ${open ? "siteNavOpen" : ""}`} aria-label="Primary navigation">
          {links.map(([label, href]) => (
            <Link href={href} key={href} onClick={() => setOpen(false)}>
              {label}
            </Link>
          ))}
          <Link className="accountLink" href="/account" onClick={() => setOpen(false)}>
            <UserRound size={17} aria-hidden="true" />
            Account
          </Link>
          <Link className="button buttonLime headerCta" href="/membership" onClick={() => setOpen(false)}>
            Build your plan
          </Link>
        </nav>
        <button
          className="iconButton mobileMenuButton"
          type="button"
          aria-label={open ? "Close navigation" : "Open navigation"}
          title={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
    </header>
  );
}
