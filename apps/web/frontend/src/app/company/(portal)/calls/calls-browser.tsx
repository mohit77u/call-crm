"use client";

import { useCallback, useEffect, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { STATUSES, STATUS_LABELS, formatDateTime, formatDuration, todayInZone, type CallStatus } from "@/lib/calls";
import { Pagination } from "@/components/pagination";
import { SearchInput } from "@/components/search-input";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { takeNavState } from "@/lib/nav-state";

type CallRow = { id: string; agent: string; phone_number: string; contact_name: string | null; call_type: string; status: CallStatus; started_at: string; duration_sec: number };
type CallsResponse = { agents: { id: number; name: string }[]; summary: { total: number; talkSec: number }; calls: CallRow[]; page: number; perPage: number; pages: number };

type Filters = { from: string; to: string; agent: string; status: string; q: string };

const EMPTY_FILTERS: Filters = { from: "", to: "", agent: "", status: "", q: "" };

function addDays(dateStr: string, n: number) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function defaultFilters(): Filters {
  const to = todayInZone();
  return { ...EMPTY_FILTERS, from: addDays(to, -6), to };
}

// "52min 40sec" / "1h 5min 10sec" style talk time.
function formatTalkTime(totalSec: number) {
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}min ${sec}sec`;
  return `${m}min ${sec}sec`;
}

function typePill(callType: string) {
  const outgoing = callType === "outgoing";
  return <span className={`tpill ${outgoing ? "out" : "in"}`}>{outgoing ? "Outgoing" : "Incoming"}</span>;
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

function statusPill(status: CallStatus) {
  return <span className={`tpill ${STATUS_CLS[status] ?? "st-other"}`}>{STATUS_LABELS[status]}</span>;
}

export function CallsBrowser({ canExport }: { canExport: boolean }) {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [draft, setDraft] = useState<Filters>(filters);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [data, setData] = useState<CallsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      const saved = takeNavState<Partial<Filters>>("crm:company:calls:filters");
      if (!saved) return;
      const next = defaultFilters();
      if (saved.from && /^\d{4}-\d{2}-\d{2}$/.test(saved.from)) next.from = saved.from;
      if (saved.to && /^\d{4}-\d{2}-\d{2}$/.test(saved.to)) next.to = saved.to;
      if (saved.agent && /^\d+$/.test(saved.agent)) next.agent = saved.agent;
      if (saved.status && (STATUSES as readonly string[]).includes(saved.status)) next.status = saved.status;
      if (typeof saved.q === "string") next.q = saved.q.slice(0, 100);
      setFilters(next);
      setDraft(next);
      setPage(1);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const sp = new URLSearchParams({ page: String(page), limit: String(perPage) });
      for (const [k, v] of Object.entries(filters)) if (v) sp.set(k, v);
      const res = await fetch(`/api/crm/calls?${sp}`);
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
    (filters.agent ? 1 : 0) +
    (filters.status ? 1 : 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Call Logs</h1>
          <p className="page-sub">
            {data ? `${data.summary.total} calls · ${formatTalkTime(data.summary.talkSec)} talk time` : "Loading…"}
          </p>
        </div>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <SearchInput
          className="w-full max-w-xs"
          placeholder="Search"
          value={filters.q}
          onSearch={(q) => { setFilters((f) => ({ ...f, q })); setPage(1); }}
        />
        <button
          type="button"
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          onClick={() => { setDraft(filters); setDrawerOpen(true); }}
        >
          <SlidersHorizontal size={14} /> Filters
          {appliedCount > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--primary)] px-1 text-[11px] font-semibold text-white">
              {appliedCount}
            </span>
          )}
        </button>
        <div className="ml-auto flex items-center gap-2">
          {canExport && <a className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50" href={`/api/calls/export?${exportQs}`}>Export CSV</a>}
        </div>
      </div>

      {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}

      <DataTable
        loading={loading}
        emptyMessage="No calls for these filters."
        rowKey={(c) => c.id}
        rows={data?.calls ?? []}
        footer={data && data.summary.total >= 10 ? (
          <Pagination
            page={data.page}
            pages={data.pages}
            total={data.summary.total}
            perPage={data.perPage}
            onPage={setPage}
            onPerPageChange={(n) => { setPerPage(n); setPage(1); }}
          />
        ) : null}
        columns={[
            { header: "Time", cell: (c) => formatDateTime(c.started_at) },
            { header: "Agent", cell: (c) => c.agent },
            { header: "Number", cell: (c) => c.phone_number },
            { header: "Name", cell: (c) => <span className="muted">{c.contact_name ?? "-"}</span> },
            { header: "Type", cell: (c) => typePill(c.call_type) },
            { header: "Status", cell: (c) => statusPill(c.status) },
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
