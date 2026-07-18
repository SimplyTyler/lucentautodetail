"use client";

import Link from "next/link";
import { CalendarDays, CarFront, CreditCard, LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import { usePathname } from "next/navigation";
import { Logo } from "./logo";

export function PortalNav({ user, admin = false }) {
  const pathname = usePathname();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/");
  }

  const links = [
    ["Overview", "/portal", LayoutDashboard],
    ["Vehicles", "/portal/vehicles", CarFront],
    ["Visits", "/portal/visits", CalendarDays],
    ["Membership", "/portal/membership", CreditCard]
  ];

  if (admin) {
    links.push(["Admin", "/admin", ShieldCheck]);
  }

  return (
    <aside className="portalSidebar">
      <Logo compact />
      <nav aria-label="Portal navigation">
        {links.map(([label, href, Icon]) => (
          <Link className={pathname === href || (href !== "/portal" && pathname.startsWith(`${href}/`)) ? "portalNavActive" : ""} href={href} key={label}>
            <Icon size={18} aria-hidden="true" /> {label}
          </Link>
        ))}
      </nav>
      <div className="sidebarUser">
        <span>{user?.name?.slice(0, 1)?.toUpperCase() || "L"}</span>
        <div><strong>{user?.name || "Lucent member"}</strong><small>{user?.email || "Preview account"}</small></div>
        <button className="iconButton" type="button" aria-label="Sign out" title="Sign out" onClick={logout}>
          <LogOut size={17} />
        </button>
      </div>
    </aside>
  );
}
