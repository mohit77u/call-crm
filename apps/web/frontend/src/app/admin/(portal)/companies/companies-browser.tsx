"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SearchInput } from "@/components/search-input";
import { formatDateTime } from "@/lib/calls";
import { planDisplayName } from "@/lib/plans";
import { setNavState } from "@/lib/nav-state";
import { deleteCompany } from "./actions";
import { RowActionsMenu } from "@/components/row-actions-menu";
import { DataTable, type DataTableColumn } from "@/components/data-table";

export type CompanyRow = {
  id: number;
  name: string;
  client_code: string;
  plan: string | null;
  created_at: string;
  admin_email: string | null;
  agents: number;
  calls: number;
};

export function CompaniesBrowser({ companies }: { companies: CompanyRow[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return companies;
    return companies.filter((c) =>
      [c.name, c.client_code, c.admin_email ?? ""].some((v) => v.toLowerCase().includes(needle)),
    );
  }, [companies, q]);

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-2">
        <SearchInput value={q} onSearch={setQ} placeholder="Search name, client code, email…" className="w-full max-w-xs" />
        <div className="flex items-center gap-2">
          <a className="btn secondary" href={`/api/admin/companies/export${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`}>Export CSV</a>
          <Link className="btn" href="/admin/companies/new">+ New Company</Link>
        </div>
      </div>

      <DataTable
          rowKey={(c) => c.id}
          rows={filtered}
          emptyMessage={q ? "No companies match your search." : "No companies yet."}
          columns={[
            { header: "Company", cell: (c) => <Link href={`/admin/companies/${c.id}`}>{c.name}</Link> },
            { header: "Plan", cell: (c) => <span className="badge other">{planDisplayName(c.plan)}</span> },
            { header: "Client Code", cell: (c) => <span className="muted">{c.client_code}</span> },
            { header: "Admin Email", cell: (c) => c.admin_email ?? "-" },
            { header: "Agents", cell: (c) => (
              <a href="/admin/agents" onClick={(e) => { e.preventDefault(); setNavState("crm:admin:agents:company", String(c.id)); router.push("/admin/agents"); }}>{c.agents}</a>
            ) },
            { header: "Calls", cell: (c) => (
              <a href="/admin/calls" onClick={(e) => { e.preventDefault(); setNavState("crm:admin:calls:filters", { company: String(c.id) }); router.push("/admin/calls"); }}>{c.calls}</a>
            ) },
            { header: "Created", cell: (c) => <span className="muted">{formatDateTime(c.created_at)}</span> },
            {
              header: "Actions",
              className: "text-right!",
              cell: (c) => (
                <RowActionsMenu
                  editHref={`/admin/companies/${c.id}`}
                  itemName={c.name}
                  itemLabel="company"
                  deleteMessage={`All admins, agents, phones and call history of ${c.name} will be permanently removed.`}
                  deleteAction={deleteCompany.bind(null, c.id)}
                  successMessage="Company deleted"
                />
              ),
            },
          ] satisfies DataTableColumn<CompanyRow>[]}
      />
    </>
  );
}
