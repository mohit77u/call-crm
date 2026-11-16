"use client";

import { useCallback, useEffect, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { SearchInput } from "@/components/search-input";
import { AppSelect } from "@/components/app-select";

type AgentOption = { id: number; name: string; active?: boolean };

type TrialRow = {
  id: number;
  name: string;
  phone: string;
  days: number;
  agentId: number;
  agentName: string;
  createdAt: string;
  updatedAt: string;
  activeUntil: string;
  status: "active" | "expired";
};

function fmtDate(s: string | null) {
  if (!s) return "-";
  return new Date(s).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtDay(s: string | null) {
  if (!s) return "-";
  return new Date(`${String(s).slice(0, 10)}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const ALL = "__all__";

export function CrmTrialsBrowser({ agents }: { agents: AgentOption[] }) {
  const [trials, setTrials] = useState<TrialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [agentFilter, setAgentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/crm/trials");
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed to load free trials");
      const data = await res.json();
      setTrials(data.trials ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load free trials");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const filtered = trials.filter(
    (t) =>
      (!agentFilter || String(t.agentId) === agentFilter) &&
      (!statusFilter || t.status === statusFilter) &&
      (!q ||
        t.name.toLowerCase().includes(q.toLowerCase()) ||
        t.phone.includes(q) ||
        (t.agentName ?? "").toLowerCase().includes(q.toLowerCase())),
  );

  const columns: DataTableColumn<TrialRow>[] = [
    {
      header: "Name",
      className: "min-w-[180px] whitespace-nowrap",
      cell: (t) => <span className="text-sm font-medium">{t.name}</span>,
    },
    {
      header: "Phone",
      className: "min-w-[130px] whitespace-nowrap",
      cell: (t) => <span className="text-sm">{t.phone}</span>,
    },
    {
      header: "Agent",
      className: "min-w-[140px] whitespace-nowrap",
      cell: (t) => <span className="text-sm">{t.agentName || "-"}</span>,
    },
    {
      header: "Days",
      className: "min-w-[70px] whitespace-nowrap",
      cell: (t) => <span className="text-sm">{t.days}</span>,
    },
    {
      header: "Active until",
      className: "min-w-[170px] whitespace-nowrap",
      cell: (t) => <span className="muted text-sm">{fmtDay(t.activeUntil)}</span>,
    },
    {
      header: "Status",
      className: "min-w-[110px] whitespace-nowrap",
      cell: (t) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-normal ${
            t.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"
          }`}
        >
          {t.status === "active" ? "Active" : "Expired"}
        </span>
      ),
    },
    { header: "Added", className: "whitespace-nowrap", cell: (t) => <span className="muted text-sm">{fmtDate(t.createdAt)}</span> },
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Free trial</h1>
          <p className="page-sub">{filtered.length} free trial{filtered.length === 1 ? "" : "s"}</p>
        </div>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <SearchInput className="w-full max-w-xs" placeholder="Search" value={q} onSearch={setQ} />
        <AppSelect
          className="w-44"
          value={agentFilter || ALL}
          onChange={(v) => setAgentFilter(v === ALL ? "" : (v ?? ""))}
          data={[
            { value: ALL, label: "All agents" },
            ...agents.map((a) => ({ value: String(a.id), label: a.name })),
          ]}
        />
        <AppSelect
          className="w-36"
          value={statusFilter || ALL}
          onChange={(v) => setStatusFilter(v === ALL ? "" : (v ?? ""))}
          data={[
            { value: ALL, label: "All status" },
            { value: "active", label: "Active" },
            { value: "expired", label: "Expired" },
          ]}
        />
      </div>

      {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}

      <DataTable
        loading={loading}
        emptyMessage="No free trials yet."
        rowKey={(t) => t.id}
        rows={filtered}
        columns={columns}
      />
    </>
  );
}
