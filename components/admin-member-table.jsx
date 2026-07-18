"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { getPlan } from "../lib/plans";

function dateLabel(value) {
  return value ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(value)) : "—";
}

export function AdminMemberTable({ members }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return members.filter((member) => {
      const matchesQuery = !needle || `${member.name} ${member.email} ${member.plan_code || ""}`.toLowerCase().includes(needle);
      const matchesStatus = status === "all" || (member.status || "lead") === status;
      return matchesQuery && matchesStatus;
    });
  }, [members, query, status]);

  return (
    <div className="adminTableSection">
      <div className="panelHeading adminTableHeading">
        <div><span className="kicker">Members</span><h2>Account health</h2></div>
        <div className="adminFilters">
          <label className="adminSearch"><Search size={17} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search members" aria-label="Search members" /></label>
          <label className="visuallyHidden" htmlFor="member-status">Filter by status</label>
          <select id="member-status" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter members by status">
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="trialing">Trialing</option>
            <option value="past_due">Past due</option>
            <option value="lead">No plan</option>
          </select>
        </div>
      </div>
      <div className="tableMeta">Showing {filtered.length} of {members.length} members</div>
      <div className="tableWrap">
        <table>
          <thead><tr><th>Member</th><th>Plan</th><th>Vehicles</th><th>Status</th><th>Joined</th></tr></thead>
          <tbody>{filtered.map((member) => <tr key={member.id}><td><strong>{member.name}</strong><small>{member.email}</small></td><td>{getPlan(member.plan_code)?.name || "No plan"}</td><td>{member.vehicle_count || 0}</td><td><span className={`statusPill status${member.status || "neutral"}`}>{member.status || "lead"}</span></td><td>{dateLabel(member.created_at)}</td></tr>)}</tbody>
        </table>
        {!filtered.length && <div className="emptyTable">No members match those filters.</div>}
      </div>
    </div>
  );
}
