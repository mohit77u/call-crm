"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { SearchInput } from "@/components/search-input";
import { formatDateTime } from "@/lib/calls";
import { planDisplayName } from "@/lib/plans";
import { setNavState } from "@/lib/nav-state";
import { deleteCompany } from "./actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { notify } from "@/lib/notify";
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
  const [deleteTarget, setDeleteTarget] = useState<CompanyRow | null>(null);
  const [deletePending, startDeleteTransition] = useTransition();

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return companies;
    return companies.filter((c) =>
      [c.name, c.client_code, c.admin_email ?? ""].some((v) => v.toLowerCase().includes(needle)),
    );
  }, [companies, q]);

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <SearchInput value={q} onSearch={setQ} placeholder="Search" className="w-full sm:max-w-xs" />
        <div className="flex items-center gap-2 max-sm:w-full max-sm:justify-end">
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
            { header: "Admin Email", cell: (c) => <span className="whitespace-pre-line text-sm">{c.admin_email ?? "-"}</span> },
            { header: "Agents", cell: (c) => (
              <a href="/admin/agents" onClick={(e) => { e.preventDefault(); setNavState("crm:admin:agents:company", String(c.id)); router.push("/admin/agents"); }}>{c.agents}</a>
            ) },
            { header: "Calls", cell: (c) => (
              <a href="/admin/calls" onClick={(e) => { e.preventDefault(); setNavState("crm:admin:calls:filters", { company: String(c.id) }); router.push("/admin/calls"); }}>{c.calls}</a>
            ) },
            { header: "Created", cell: (c) => <span className="muted">{formatDateTime(c.created_at)}</span> },
            {
              header: "",
              className: "sticky right-0 z-10 min-w-[88px] bg-white",
              cell: (c) => (
                <div className="flex items-center gap-1.5">
                  <Link
                    href={`/admin/companies/${c.id}`}
                    aria-label="Edit company"
                    title="Edit"
                    className="inline-flex items-center justify-center rounded-md bg-slate-200 p-2.5 text-slate-700 transition-colors hover:bg-slate-300"
                  >
                    <Pencil size={12} strokeWidth={2.2} color="#334155" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(c)}
                    aria-label="Delete company"
                    title="Delete"
                    className="inline-flex items-center justify-center rounded-md bg-red-50 p-2.5 text-red-500 transition-colors hover:bg-red-100"
                  >
                    <Trash2 size={12} strokeWidth={2.2} />
                  </button>
                </div>
              ),
            },
          ] satisfies DataTableColumn<CompanyRow>[]}
      />

      <ConfirmDialog
        open={deleteTarget != null}
        onClose={() => setDeleteTarget(null)}
        title="Delete company?"
        message={deleteTarget ? `All admins, agents, phones and call history of ${deleteTarget.name} will be permanently removed.` : undefined}
        confirmLabel="Delete"
        danger
        pending={deletePending}
        onConfirm={() => {
          if (!deleteTarget) return;
          startDeleteTransition(async () => {
            const res = await deleteCompany(deleteTarget.id);
            setDeleteTarget(null);
            if (res?.error) notify.error(res.error);
            else {
              notify.success("Company deleted");
              router.refresh();
            }
          });
        }}
      />
    </>
  );
}
