"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { formatDateTime } from "@/lib/calls";
import { planDisplayName } from "@/lib/plans";
import { deleteCompany } from "./actions";
import { RowActionsMenu } from "@/components/row-actions-menu";

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
        <div className="relative w-full max-w-xs">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, client code, email…"
            className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <a className="btn secondary" href={`/api/admin/companies/export${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`}>Export CSV</a>
          <Link className="btn" href="/admin/companies/new">+ New Company</Link>
        </div>
      </div>

      <div className="card p-0">
        <table>
          <thead>
            <tr><th>Company</th><th>Plan</th><th>Client Code</th><th>Admin Email</th><th>Agents</th><th>Calls</th><th>Created</th><th className="text-right!">Actions</th></tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td><Link href={`/admin/companies/${c.id}`}>{c.name}</Link></td>
                <td><span className="badge other">{planDisplayName(c.plan)}</span></td>
                <td className="muted">{c.client_code}</td>
                <td>{c.admin_email ?? "-"}</td>
                <td><Link href={`/admin/agents?company=${c.id}`}>{c.agents}</Link></td>
                <td><Link href={`/admin/calls?company=${c.id}`}>{c.calls}</Link></td>
                <td className="muted">{formatDateTime(c.created_at)}</td>
                <td className="text-right!">
                  <RowActionsMenu
                    editHref={`/admin/companies/${c.id}`}
                    itemName={c.name}
                    itemLabel="company"
                    deleteMessage={`All admins, agents, phones and call history of ${c.name} will be permanently removed.`}
                    deleteAction={deleteCompany.bind(null, c.id)}
                    successMessage="Company deleted"
                  />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={8} className="muted">{q ? "No companies match your search." : "No companies yet."}</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
