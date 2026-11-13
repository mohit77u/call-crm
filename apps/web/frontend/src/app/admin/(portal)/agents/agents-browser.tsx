"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Search } from "lucide-react";
import { formatDateTime } from "@/lib/calls";

export type AgentRow = {
  id: number;
  name: string;
  username: string;
  phone: string | null;
  active: boolean;
  company: string;
  company_id: number;
  last_sync_at: string | null;
};

export function AgentsBrowser({ agents, companies, initialCompany }: { agents: AgentRow[]; companies: { id: number; name: string }[]; initialCompany?: string }) {
  const [q, setQ] = useState("");
  const [company, setCompany] = useState(initialCompany ?? "");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return agents.filter((a) => {
      if (company && String(a.company_id) !== company) return false;
      if (!needle) return true;
      return [a.name, a.username, a.company, a.phone ?? ""].some((v) => v.toLowerCase().includes(needle));
    });
  }, [agents, q, company]);

  const exportQs = new URLSearchParams();
  if (q.trim()) exportQs.set("q", q.trim());
  if (company) exportQs.set("company", company);

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="relative w-full max-w-xs">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, username, company…"
              className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            />
          </div>
          <div className="relative">
            <select
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="h-9 appearance-none rounded-md border border-slate-300 bg-white py-0 pl-3 pr-8 text-sm leading-9 text-slate-700 focus:border-[var(--primary)] focus:outline-none"
            >
              <option value="">All Companies</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a className="btn secondary" href={`/api/admin/agents/export?${exportQs}`}>Export CSV</a>
        </div>
      </div>

      <div className="card p-0">
        <table>
          <thead>
            <tr><th>Company</th><th>Name</th><th>Username</th><th>Phone</th><th>Status</th><th>Last Sync</th></tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id}>
                <td><Link href={`/admin/companies/${a.company_id}`}>{a.company}</Link></td>
                <td>{a.name}</td>
                <td>{a.username}</td>
                <td>{a.phone ?? "-"}</td>
                <td>{a.active ? "Active" : <span className="muted">Disabled</span>}</td>
                <td className="muted">{a.last_sync_at ? formatDateTime(a.last_sync_at) : "Never"}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="muted">{q || company ? "No agents match your filters." : "No agents yet."}</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
