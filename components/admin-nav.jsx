"use client";

import Link from "next/link";
import { CalendarClock, CarFront, CreditCard, ExternalLink, LayoutDashboard, LogOut, UsersRound } from "lucide-react";
import { usePathname } from "next/navigation";
import { Logo } from "./logo";

const links = [
  ["Dashboard", "/admin", LayoutDashboard],
  ["Customers", "/admin/customers", UsersRound],
  ["Appointments", "/admin/appointments", CalendarClock],
  ["Memberships", "/admin/memberships", CreditCard],
  ["Vehicles", "/admin/vehicles", CarFront]
];

export function AdminNav({ user }) {
  const pathname = usePathname();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/");
  }

  return (
    <aside className="portalSidebar adminSidebar">
      <Logo compact />
      <nav aria-label="Admin navigation">
        {links.map(([label, href, Icon]) => (
          <Link className={pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`)) ? "portalNavActive" : ""} href={href} key={label}>
            <Icon size={18} aria-hidden="true" /> {label}
          </Link>
        ))}
      </nav>
      <Link className="adminPortalLink" href="/portal"><ExternalLink size={16} /> Member portal</Link>
      <div className="sidebarUser">
        <span>{user?.name?.slice(0, 1)?.toUpperCase() || "L"}</span>
        <div><strong>{user?.name || "Lucent operations"}</strong><small>{user?.email || "Admin preview"}</small></div>
        <button className="iconButton" type="button" aria-label="Sign out" title="Sign out" onClick={logout}><LogOut size={17} /></button>
      </div>
    </aside>
  );
}
