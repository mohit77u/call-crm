"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatDateTime } from "@/lib/calls";
import { SearchInput } from "@/components/search-input";
import { AppSelect } from "@/components/app-select";
import { DataTable } from "@/components/data-table";
import { takeNavState } from "@/lib/nav-state";

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

export function AgentsBrowser({ agents, companies }: { agents: AgentRow[]; companies: { id: number; name: string }[] }) {
  const [q, setQ] = useState("");
  const [company, setCompany] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      const saved = takeNavState<string>("crm:admin:agents:company");
      if (saved && /^\d+$/.test(saved)) setCompany(saved);
    }, 0);
    return () => clearTimeout(t);
  }, []);

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
          <SearchInput value={q} onSearch={setQ} placeholder="Search" className="w-full max-w-xs" />
          <AppSelect
            className="w-52"
            value={company || "__all__"}
            onChange={(v) => setCompany(v === "__all__" ? "" : (v ?? ""))}
            data={[
              { value: "__all__", label: "All Companies" },
              ...companies.map((c) => ({ value: String(c.id), label: c.name })),
            ]}
          />
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
