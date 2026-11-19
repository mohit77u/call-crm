"use client";

import { useEffect, useState } from "react";
import { Download, FileSpreadsheet, RefreshCw } from "lucide-react";
import { formatDateTime } from "@/lib/calls";
import { SearchInput } from "@/components/search-input";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { Pagination } from "@/components/pagination";

export type ImportRow = {
  id: number;
  type: "lead" | "client";
  fileName: string;
  hasHeader: boolean;
  status: "processing" | "completed" | "failed" | string;
  totalRows: number;
  imported: number;
  updated?: number;
  failed: number;
  pending?: number;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
};

const IMPORTS_ENDPOINTS = ["/api/crm/leads/imports", "/api/crm/clients/imports"] as const;
const TYPE_BY_ENDPOINT = { "/api/crm/leads/imports": "lead", "/api/crm/clients/imports": "client" } as const;

async function fetchAllImports(): Promise<ImportRow[]> {
  const results = await Promise.all(
    IMPORTS_ENDPOINTS.map(async (url) => {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return [] as ImportRow[];
      const data = (await res.json()) as { imports?: ImportRow[] };
      const type = TYPE_BY_ENDPOINT[url];
      return (data.imports ?? []).map((r) => ({ ...r, type }));
    }),
  );
  return results
    .flat()
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

const STATUS_CLS: Record<string, string> = {
  processing: "bg-blue-50 text-blue-600",
  completed: "bg-emerald-50 text-emerald-600",
  failed: "bg-red-50 text-red-500",
};

export function ImportsBrowser({ initial }: { initial: ImportRow[] }) {
  const [rows, setRows] = useState(initial);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [refreshing, setRefreshing] = useState(false);

  const hasProcessing = rows.some((r) => r.status === "processing");

  async function refresh() {
    setRefreshing(true);
    try {
      setRows(await fetchAllImports());
    } catch {
      /* ignore */
    } finally {
      setRefreshing(false);
    }
  }

  // Auto-refresh every 30s while any import is still processing.
  useEffect(() => {
    if (!hasProcessing) return;
    const t = setInterval(async () => {
      try {
        setRows(await fetchAllImports());
      } catch {
        /* keep polling */
      }
    }, 30_000);
    return () => clearInterval(t);
  }, [hasProcessing]);

  const filtered = rows.filter((r) => !q.trim() || r.fileName.toLowerCase().includes(q.trim().toLowerCase()));
  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, pages);
  const paged = filtered.slice((safePage - 1) * perPage, safePage * perPage);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Imported files</h1>
          <p className="page-sub">{rows.length} import{rows.length === 1 ? "" : "s"}</p>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <SearchInput value={q} onSearch={(v) => { setQ(v); setPage(1); }} placeholder="Search file name" className="w-full sm:max-w-xs" />
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <DataTable
        rowKey={(r) => `${r.type}-${r.id}`}
        rows={paged}
        emptyMessage={q ? "No imports match your search." : "No imports yet."}
        columns={[
          {
            header: "File",
            cell: (r) => (
              <span className="inline-flex items-center gap-2 font-medium text-slate-800">
                <FileSpreadsheet size={15} className="text-slate-400" />
                {r.fileName}
              </span>
            ),
          },
          {
            header: "Type",
            cell: (r) => (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold capitalize text-slate-600">
                {r.type}
              </span>
            ),
          },
          { header: "Uploaded", cell: (r) => <span className="muted">{formatDateTime(r.createdAt)}</span> },
          {
            header: "Status",
            cell: (r) => (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLS[r.status] ?? "bg-slate-100 text-slate-500"}`}
                title={r.status === "failed" ? (r.errorMessage ?? undefined) : undefined}
              >
                {r.status === "processing" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />}
                {r.status === "processing" ? "Processing" : r.status === "completed" ? "Completed" : "Failed"}
              </span>
            ),
          },
          { header: "Total", cell: (r) => (r.status === "processing" && r.totalRows === 0 ? "…" : r.totalRows) },
          { header: "Imported", cell: (r) => <span className="font-medium text-emerald-600">{r.imported}</span> },
          { header: "Updated", cell: (r) => (r.updated != null && r.updated > 0 ? <span className="font-medium text-blue-600">{r.updated}</span> : <span className="muted">{r.updated ?? "—"}</span>) },
          { header: "Failed", cell: (r) => (r.failed > 0 ? <span className="font-medium text-red-500">{r.failed}</span> : <span className="muted">0</span>) },
          { header: "Pending", cell: (r) => ((r.pending ?? 0) > 0 ? r.pending : <span className="muted">0</span>) },
          {
            header: "",
            className: "sticky right-0 z-10 min-w-[110px] bg-white",
            cell: (r) =>
              r.status === "completed" && r.failed > 0 ? (
                <a
                  href={`/api/crm/${r.type === "client" ? "clients" : "leads"}/imports/${r.id}/errors.csv`}
                  className="inline-flex items-center gap-1.5 rounded-md bg-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-300"
                >
                  <Download size={12} /> Error file
                </a>
              ) : null,
          },
        ] satisfies DataTableColumn<ImportRow>[]}
      />

      {filtered.length > perPage && (
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <Pagination
            page={safePage}
            pages={pages}
            total={filtered.length}
            perPage={perPage}
            onPage={setPage}
            onPerPageChange={(n) => { setPerPage(n); setPage(1); }}
          />
        </div>
      )}
    </>
  );
}
