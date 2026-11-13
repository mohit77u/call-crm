"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { formatDateTime } from "@/lib/calls";
import { SearchInput } from "@/components/search-input";
import { DataTable } from "@/components/data-table";

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
          <SearchInput value={q} onSearch={setQ} placeholder="Search name, username, company…" className="w-full max-w-xs" />
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

      <DataTable
          rowKey={(a) => a.id}
          rows={filtered}
          emptyMessage={q || company ? "No agents match your filters." : "No agents yet."}
          columns={[
            { header: "Company", cell: (a) => <Link href={`/admin/companies/${a.company_id}`}>{a.company}</Link> },
            { header: "Name", cell: (a) => a.name },
            { header: "Username", cell: (a) => a.username },
            { header: "Phone", cell: (a) => a.phone ?? "-" },
            { header: "Status", cell: (a) => (a.active ? "Active" : <span className="muted">Disabled</span>) },
            { header: "Last Sync", cell: (a) => <span className="muted">{a.last_sync_at ? formatDateTime(a.last_sync_at) : "Never"}</span> },
          ]}
        />
    </>
  );
}
