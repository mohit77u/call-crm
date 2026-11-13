"use client";

import { useCallback, useEffect, useState } from "react";
import { REQUEST_STATUS_LABELS, type LeadRow } from "@/lib/leads";
import { DataTable, type DataTableColumn } from "@/components/data-table";

function fmtDate(s: string | null) {
  if (!s) return "-";
  return new Date(s).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

const STATUS_CLS: Record<string, string> = {
  pending: "st-other",
  approved: "st-connected",
  rejected: "st-rejected",
};

export function AgentRequestsBrowser() {
  const [requests, setRequests] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/agent/leads/requests");
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed to load requests");
      const data = await res.json();
      setRequests(data.requests ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const columns: DataTableColumn<LeadRow>[] = [
    { header: "Name", cell: (r) => <span className="font-medium">{r.name}</span> },
    { header: "Phone", cell: (r) => r.phone ?? "-" },
    { header: "Email", cell: (r) => r.email ?? "-" },
    {
      header: "Status",
      cell: (r) => (
        <span className={`tpill ${STATUS_CLS[r.requestStatus ?? ""] ?? "st-other"}`}>
          {REQUEST_STATUS_LABELS[r.requestStatus ?? ""] ?? r.requestStatus}
        </span>
      ),
    },
    { header: "Notes", cell: (r) => <span className="block max-w-[240px] truncate text-sm text-slate-600">{r.notes || "-"}</span> },
    { header: "Sent", cell: (r) => <span className="muted text-sm">{fmtDate(r.createdAt)}</span> },
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Lead requests</h1>
          <p className="page-sub">Track requests you sent to your admin</p>
        </div>
      </div>
      {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}
      <DataTable loading={loading} emptyMessage="No requests yet." rowKey={(r) => r.id} rows={requests} columns={columns} />
    </>
  );
}
