"use client";

import { useCallback, useEffect, useState } from "react";
import { STATUSES, STATUS_LABELS, formatDateTime, formatDuration, todayInZone, type CallStatus } from "@/lib/calls";
import { Pagination } from "@/components/pagination";
import { SearchInput } from "@/components/search-input";
import { DataTable, type DataTableColumn } from "@/components/data-table";

type CallRow = {
  id: string;
  company: string;
  agent: string;
  phone_number: string;
  contact_name: string | null;
  call_type: string;
  status: CallStatus;
  started_at: string;
  duration_sec: number;
};

type CallsResponse = {
  companies: { id: number; name: string }[];
  agents: { id: number; name: string }[];
  summary: { total: number; talkSec: number };
  calls: CallRow[];
  page: number;
  pages: number;
};

type Filters = { from: string; to: string; company: string; agent: string; status: string; q: string };

const EMPTY_FILTERS: Filters = { from: "", to: "", company: "", agent: "", status: "", q: "" };

function addDays(dateStr: string, n: number) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function defaultFilters(): Filters {
  const to = todayInZone();
  return { ...EMPTY_FILTERS, from: addDays(to, -6), to };
}

const STATUS_CLS: Record<string, string> = {
  connected: "st-connected",
  received: "st-received",
  not_connected: "st-notconn",
  missed: "st-missed",
  rejected: "st-rejected",
  blocked: "st-blocked",
  other: "st-other",
};

export function CallsBrowser({ initialFilters }: { initialFilters?: Partial<Filters> }) {
  const [filters, setFilters] = useState<Filters>(() => ({ ...defaultFilters(), ...(initialFilters ?? {}) }));
  const [draft, setDraft] = useState<Filters>(filters);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [data, setData] = useState<CallsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const sp = new URLSearchParams({ page: String(page), limit: String(perPage) });
      for (const [k, v] of Object.entries(filters)) if (v) sp.set(k, v);
      const res = await fetch(`/api/admin/calls?${sp}`);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed to load calls");
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load calls");
    } finally {
      setLoading(false);
    }
  }, [filters, page, perPage]);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const applyFilters = () => {
    setFilters(draft);
    setPage(1);
    setDrawerOpen(false);
  };
  const clearFilters = () => {
    const def = defaultFilters();
    setDraft(def);
    setFilters(def);
    setPage(1);
    setDrawerOpen(false);
  };

  const exportQs = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) if (v) exportQs.set(k, v);

  const def = defaultFilters();
  const appliedCount =
    (filters.from !== def.from ? 1 : 0) +
    (filters.to !== def.to ? 1 : 0) +
    (filters.company ? 1 : 0) +
    (filters.agent ? 1 : 0) +
    (filters.status ? 1 : 0);

  const toolbarBtn =
    "inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50";

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-2">
        <SearchInput
          className="w-full max-w-xs"
          placeholder="Search number or name…"
          value={filters.q}
          onSearch={(q) => { setFilters((f) => ({ ...f, q })); setPage(1); }}
        />
        <div className="flex items-center gap-2">
          <a className={toolbarBtn} href={`/api/admin/calls/export?${exportQs}`}>Export CSV</a>
          <button
            type="button"
            className={toolbarBtn}
            onClick={() => { setDraft(filters); setDrawerOpen(true); }}
          >
            Filters
            {appliedCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--primary)] px-1 text-[11px] font-semibold text-white">
                {appliedCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {error && <div className="error mb-3">{error}</div>}

      <DataTable
        minHeight={300}
        loading={loading}
        emptyMessage="No calls for these filters."
        rowKey={(c) => c.id}
        rows={data?.calls ?? []}
        footer={data ? (
          <Pagination
            page={data.page}
            pages={data.pages}
            total={data.summary.total}
            perPage={perPage}
            onPage={setPage}
            onPerPageChange={(n) => { setPerPage(n); setPage(1); }}
          />
        ) : null}
        columns={[
            { header: "Time", cell: (c) => formatDateTime(c.started_at) },
            { header: "Company", cell: (c) => c.company },
            { header: "Agent", cell: (c) => c.agent },
            { header: "Number", cell: (c) => c.phone_number },
            { header: "Name", cell: (c) => <span className="muted">{c.contact_name ?? "-"}</span> },
            { header: "Type", cell: (c) => (c.call_type === "outgoing" ? "Outgoing" : "Incoming") },
            { header: "Status", cell: (c) => <span className={`tpill ${STATUS_CLS[c.status] ?? "st-other"}`}>{STATUS_LABELS[c.status]}</span> },
            { header: "Duration", cell: (c) => formatDuration(c.duration_sec) },
          ] satisfies DataTableColumn<CallRow>[]}
      />

      {drawerOpen && (
        <>
          <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)} />
          <aside className="drawer">
            <div className="drawer-head">
              <h2>Filters</h2>
              <button type="button" className="drawer-close" onClick={() => setDrawerOpen(false)}>✕</button>
            </div>
            <div className="drawer-body">
              <label className="drawer-field">
                <span>From</span>
                <input type="date" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} />
              </label>
              <label className="drawer-field">
                <span>To</span>
                <input type="date" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} />
              </label>
              <label className="drawer-field">
                <span>Company</span>
                <select value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })}>
                  <option value="">All companies</option>
                  {(data?.companies ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <label className="drawer-field">
                <span>Agent</span>
                <select value={draft.agent} onChange={(e) => setDraft({ ...draft, agent: e.target.value })}>
                  <option value="">All agents</option>
                  {(data?.agents ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </label>
              <label className="drawer-field">
                <span>Status</span>
                <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
                  <option value="">All statuses</option>
                  {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </label>
            </div>
            <div className="drawer-foot">
              <button type="button" className="btn secondary" style={{ flex: 1 }} onClick={clearFilters}>Clear</button>
              <button type="button" className="btn" style={{ flex: 1 }} onClick={applyFilters}>Apply</button>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
