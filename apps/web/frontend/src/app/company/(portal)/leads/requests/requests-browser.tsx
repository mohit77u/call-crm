"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { X } from "lucide-react";
import { type LeadRow } from "@/lib/leads";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { Spinner } from "@/components/spinner";
import { AppSelect } from "@/components/app-select";
import { notify } from "@/lib/notify";
import { approveLeadRequest, rejectLeadRequest } from "../actions";

type AgentOption = { id: number; name: string };

function fmtDate(s: string | null) {
  if (!s) return "-";
  return new Date(s).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function LeadRequestsBrowser({ agents }: { agents: AgentOption[] }) {
  const [requests, setRequests] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [assignFor, setAssignFor] = useState<LeadRow | null>(null);
  const [assignAgent, setAssignAgent] = useState("");
  const [rejectFor, setRejectFor] = useState<LeadRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [, startTransition] = useTransition();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/crm/leads/requests");
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

  function approve() {
    if (!assignFor || !assignAgent) return notify.error("Select an agent");
    setPendingId(assignFor.id);
    startTransition(async () => {
      const res = await approveLeadRequest(assignFor.id, Number(assignAgent));
      setPendingId(null);
      if (res.error) notify.error(res.error);
      else {
        notify.success(res.notice ?? "Approved");
        setAssignFor(null);
        setAssignAgent("");
        load();
      }
    });
  }

  function reject() {
    if (!rejectFor) return;
    setPendingId(rejectFor.id);
    startTransition(async () => {
      const res = await rejectLeadRequest(rejectFor.id, rejectReason);
      setPendingId(null);
      if (res.error) notify.error(res.error);
      else {
        notify.success(res.notice ?? "Rejected");
        setRejectFor(null);
        setRejectReason("");
        load();
      }
    });
  }

  const columns: DataTableColumn<LeadRow>[] = [
    { header: "Name", cell: (r) => <span className="font-medium">{r.name}</span> },
    { header: "Phone", cell: (r) => r.phone ?? "-" },
    { header: "Email", cell: (r) => r.email ?? "-" },
    { header: "Requested by", cell: (r) => r.agentName ?? "-" },
    { header: "Notes", cell: (r) => <span className="block max-w-[220px] truncate text-sm text-slate-600">{r.notes || "-"}</span> },
    { header: "Sent", cell: (r) => <span className="muted text-sm">{fmtDate(r.createdAt)}</span> },
    {
      header: "Actions",
      cell: (r) => (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pendingId === r.id}
            onClick={() => {
              setAssignFor(r);
              setAssignAgent(agents[0] ? String(agents[0].id) : "");
            }}
            className="inline-flex h-8 items-center rounded-md bg-[var(--primary)] px-3 text-xs font-medium text-white hover:bg-[var(--primary-dark)] disabled:opacity-60"
          >
            Approve
          </button>
          <button
            type="button"
            disabled={pendingId === r.id}
            onClick={() => {
              setRejectFor(r);
              setRejectReason("");
            }}
            className="inline-flex h-8 items-center rounded-md border border-red-300 bg-white px-3 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            Reject
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Lead requests</h1>
          <p className="page-sub">{requests.length} pending request{requests.length === 1 ? "" : "s"} · approve to assign to an agent</p>
        </div>
      </div>
      {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}
      <DataTable loading={loading} emptyMessage="No pending requests." rowKey={(r) => r.id} rows={requests} columns={columns} />

      {assignFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => !pendingId && setAssignFor(null)}>
          <div className="relative w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <span
              role="button"
              aria-label="Close"
              onClick={() => {
                if (!pendingId) setAssignFor(null);
              }}
              className="absolute right-3 top-3 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={16} />
            </span>
            <h3 className="mb-1 pr-6 text-base font-semibold text-slate-900">Assign lead</h3>
            <p className="mb-4 text-sm text-slate-500">
              {assignFor.name} — requested by {assignFor.agentName ?? "agent"}
            </p>
            <label className="mb-4 block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Assign to agent</span>
              <AppSelect
                value={assignAgent || null}
                onChange={(v) => setAssignAgent(v ?? "")}
                placeholder="Select agent"
                data={agents.map((a) => ({ value: String(a.id), label: a.name }))}
              />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setAssignFor(null)} disabled={!!pendingId} className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button type="button" onClick={approve} disabled={!assignAgent || !!pendingId} className="inline-flex h-9 items-center gap-2 rounded-md bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-dark)] disabled:opacity-60">
                {pendingId ? <><Spinner />Approving…</> : "Approve & assign"}
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => !pendingId && setRejectFor(null)}>
          <div className="relative w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <span
              role="button"
              aria-label="Close"
              onClick={() => {
                if (!pendingId) setRejectFor(null);
              }}
              className="absolute right-3 top-3 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={16} />
            </span>
            <h3 className="mb-1 pr-6 text-base font-semibold text-slate-900">Reject request</h3>
            <p className="mb-4 text-sm text-slate-500">{rejectFor.name} — requested by {rejectFor.agentName ?? "agent"}</p>
            <label className="mb-4 block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Reason (optional)</span>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Why is this lead being rejected?"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setRejectFor(null)} disabled={!!pendingId} className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button type="button" onClick={reject} disabled={!!pendingId} className="inline-flex h-9 items-center gap-2 rounded-md bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">
                {pendingId ? <><Spinner />Rejecting…</> : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
