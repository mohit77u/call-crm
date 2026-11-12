"use client";

import { useCallback, useEffect, useState } from "react";
import { STATUSES, STATUS_LABELS, formatDateTime, formatDuration, todayInZone, type CallStatus } from "@/lib/calls";

type CallRow = { id: string; agent: string; phone_number: string; contact_name: string | null; call_type: string; status: CallStatus; started_at: string; duration_sec: number };
type CallsResponse = { agents: { id: number; name: string }[]; summary: { total: number; talkSec: number }; calls: CallRow[]; page: number; perPage: number; pages: number };

type Filters = { from: string; to: string; agent: string; status: string; q: string };

const PER_PAGE_OPTIONS = [10, 20, 25, 50, 100];
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
  const [perPage, setPerPage] = useState(20);
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
    const empty = { ...EMPTY_FILTERS };
    setDraft(empty);
    setFilters(empty);
    setPage(1);
    setDrawerOpen(false);
  };
  const quickSearch = (q: string) => {
    setFilters((f) => ({ ...f, q }));
    setPage(1);
  };

  const exportQs = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) if (v) exportQs.set(k, v);

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
      <div className="page-head">
        <div>
          <h1>Call logs</h1>
          <p className="page-sub">
            {data ? `${data.summary.total} calls · ${formatTalkTime(data.summary.talkSec)} talk time` : "Loading…"}
          </p>
        </div>
        <div className="page-actions">
          {canExport && <a className="btn secondary" href={`/api/calls/export?${exportQs}`}>Export CSV</a>}
        </div>
      </div>

      <div className="call-toolbar">
        <input
          className="search-box"
          placeholder="Search number or name…"
          defaultValue={filters.q}
          onKeyDown={(e) => e.key === "Enter" && quickSearch((e.target as HTMLInputElement).value.trim())}
        />
        <button type="button" className="btn secondary" onClick={() => { setDraft(filters); setDrawerOpen(true); }}>
          Filters{filters.agent || filters.status || filters.from !== defaultFilters().from || filters.to !== defaultFilters().to ? " •" : ""}
        </button>
      </div>

      {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}

      <div className="card">
        <table>
          <thead>
            <tr><th>Time</th><th>Agent</th><th>Number</th><th>Name</th><th>Type</th><th>Status</th><th>Duration</th></tr>
          </thead>
          <tbody>
            {(data?.calls ?? []).map((c) => (
              <tr key={c.id}>
                <td>{formatDateTime(c.started_at)}</td>
                <td>{c.agent}</td>
                <td>{c.phone_number}</td>
                <td className="muted">{c.contact_name ?? "-"}</td>
                <td>{typePill(c.call_type)}</td>
                <td>{statusPill(c.status)}</td>
                <td>{formatDuration(c.duration_sec)}</td>
              </tr>
            ))}
            {!loading && (data?.calls.length ?? 0) === 0 && <tr><td colSpan={7} className="muted">No calls for these filters.</td></tr>}
            {loading && <tr><td colSpan={7} className="muted">Loading…</td></tr>}
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

        <div className="perpage-row">
          <label>
            Rows per page{" "}
            <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}>
              {PER_PAGE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        </div>
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
