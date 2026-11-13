"use client";

import { useCallback, useEffect, useState } from "react";
import { STATUSES, STATUS_LABELS, formatDateTime, formatDuration, todayInZone, type CallStatus } from "@/lib/calls";

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

export function CallsBrowser() {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [draft, setDraft] = useState<Filters>(filters);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<CallsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const sp = new URLSearchParams({ page: String(page) });
      for (const [k, v] of Object.entries(filters)) if (v) sp.set(k, v);
      const res = await fetch(`/api/admin/calls?${sp}`);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed to load calls");
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load calls");
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

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
    const empty = { ...EMPTY_FILTERS };
    setDraft(empty);
    setFilters(empty);
    setPage(1);
    setDrawerOpen(false);
  };

  const exportQs = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) if (v) exportQs.set(k, v);

  const hasActiveFilters = Boolean(filters.company || filters.agent || filters.status || filters.q || filters.from !== defaultFilters().from || filters.to !== defaultFilters().to);

  const pageNumbers = (() => {
    if (!data) return [] as number[];
    const { page: cur, pages } = data;
    const nums: number[] = [];
    const start = Math.max(1, Math.min(cur - 2, pages - 4));
    for (let i = start; i <= Math.min(pages, start + 4); i++) nums.push(i);
    return nums;
  })();

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <input
            className="h-9 w-full max-w-xs rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            placeholder="Search number or name…"
            defaultValue={filters.q}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const q = (e.target as HTMLInputElement).value.trim();
                setFilters((f) => ({ ...f, q }));
                setPage(1);
              }
            }}
          />
          <button type="button" className="btn secondary" onClick={() => { setDraft(filters); setDrawerOpen(true); }}>
            Filters{hasActiveFilters ? " •" : ""}
          </button>
        </div>
        <a className="btn secondary" href={`/api/admin/calls/export?${exportQs}`}>Export CSV</a>
      </div>

      {error && <div className="error mb-3">{error}</div>}

      <div className="card p-0">
        <table>
          <thead>
            <tr><th>Time</th><th>Company</th><th>Agent</th><th>Number</th><th>Name</th><th>Type</th><th>Status</th><th>Duration</th></tr>
          </thead>
          <tbody>
            {(data?.calls ?? []).map((c) => (
              <tr key={c.id}>
                <td>{formatDateTime(c.started_at)}</td>
                <td>{c.company}</td>
                <td>{c.agent}</td>
                <td>{c.phone_number}</td>
                <td className="muted">{c.contact_name ?? "-"}</td>
                <td>{c.call_type === "outgoing" ? "Outgoing" : "Incoming"}</td>
                <td><span className={`tpill ${STATUS_CLS[c.status] ?? "st-other"}`}>{STATUS_LABELS[c.status]}</span></td>
                <td>{formatDuration(c.duration_sec)}</td>
              </tr>
            ))}
            {!loading && (data?.calls.length ?? 0) === 0 && <tr><td colSpan={8} className="muted">No calls for these filters.</td></tr>}
            {loading && <tr><td colSpan={8} className="muted">Loading…</td></tr>}
          </tbody>
        </table>

        {data && data.pages > 1 && (
          <div className="pager">
            <button type="button" className="pg-btn" disabled={data.page <= 1} onClick={() => setPage(data.page - 1)}>← Prev</button>
            {pageNumbers.map((n) => (
              <button key={n} type="button" className={`pg-btn${n === data.page ? " active" : ""}`} onClick={() => setPage(n)}>{n}</button>
            ))}
            <button type="button" className="pg-btn" disabled={data.page >= data.pages} onClick={() => setPage(data.page + 1)}>Next →</button>
            <span className="muted pager-info">Page {data.page} of {data.pages}</span>
          </div>
        )}
      </div>

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
