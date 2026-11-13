"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Download, Upload, X, SlidersHorizontal } from "lucide-react";
import { Drawer } from "@mantine/core";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { leadFormSchema, type LeadFormValues } from "@/lib/validation";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, type LeadRow } from "@/lib/leads";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { Pagination } from "@/components/pagination";
import { SearchInput } from "@/components/search-input";
import { TextField, EmailField, TextareaField, SelectField, ReqMark } from "@/components/fields";
import { AppSelect } from "@/components/app-select";
import { Spinner } from "@/components/spinner";
import { notify } from "@/lib/notify";
import { createLead, updateLead } from "./actions";
import { ImportLeadsModal } from "./import-modal";

type AgentOption = { id: number; name: string; active?: boolean };
type LeadsResponse = { leads: LeadRow[]; total: number; page: number; pages: number; perPage: number };

function fmtDate(s: string | null) {
  if (!s) return "-";
  return new Date(s).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

const ALL = "__all";

function EditableText({
  value,
  onSave,
  className = "",
}: {
  value: string | null;
  onSave: (v: string) => Promise<{ error?: string }>;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [pending, startTransition] = useTransition();

  function commit() {
    setEditing(false);
    if (draft.trim() !== (value ?? "").trim()) {
      startTransition(async () => {
        const res = await onSave(draft.trim());
        if (res?.error) notify.error(res.error);
      });
    }
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        disabled={pending}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(value ?? "");
            setEditing(false);
          }
        }}
        className="w-full rounded border border-[var(--primary)] bg-white px-1.5 py-0.5 text-sm text-slate-800 shadow-sm outline-none"
      />
    );
  }
  return (
    <span
      onClick={() => {
        setDraft(value ?? "");
        setEditing(true);
      }}
      className={`block w-full cursor-text truncate rounded px-1 py-0.5 text-sm ${className}`}
      title={value ?? undefined}
    >
      {value || <span className="text-slate-400">-</span>}
    </span>
  );
}

function LeadFormModal({
  lead,
  agents,
  onClose,
  onDone,
}: {
  lead: LeadRow | null;
  agents: AgentOption[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const isNew = lead === null;
  const {
    control,
    handleSubmit,
    reset,
  } = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: { name: "", phone: "", email: "", notes: "", status: "new", assignedAgentId: "" },
  });

  useEffect(() => {
    reset(
      lead
        ? {
            name: lead.name,
            phone: lead.phone ?? "",
            email: lead.email ?? "",
            notes: lead.notes ?? "",
            status: lead.status,
            assignedAgentId: lead.assignedAgentId ? String(lead.assignedAgentId) : "",
          }
        : { name: "", phone: "", email: "", notes: "", status: "new", assignedAgentId: "" },
    );
  }, [lead, reset]);

  if (!isNew && !lead) return null;
  if (isNew && lead !== null) return null;

  function onValid(data: LeadFormValues) {
    const assignedAgentId = data.assignedAgentId ? Number(data.assignedAgentId) : null;
    startTransition(async () => {
      const res = isNew
        ? await createLead({
            name: data.name,
            phone: data.phone || undefined,
            email: data.email || undefined,
            notes: data.notes || undefined,
            status: data.status || undefined,
            assignedAgentId,
          })
        : await updateLead(lead!.id, {
            name: data.name,
            phone: data.phone || null,
            email: data.email || null,
            notes: data.notes || null,
            status: data.status,
            assignedAgentId,
          });
      if (res.error) notify.error(res.error);
      else {
        notify.success(res.notice ?? "Saved");
        onDone();
        onClose();
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => !pending && onClose()}>
      <div className="relative w-full max-w-md rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <span
          role="button"
          aria-label="Close"
          onClick={() => {
            if (!pending) onClose();
          }}
          className="absolute right-3 top-3 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X size={16} />
        </span>
        <h3 className="mb-4 pr-6 text-base font-semibold text-slate-900">{isNew ? "Add lead" : "Edit lead"}</h3>
        <form onSubmit={handleSubmit(onValid)} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Controller
            name="name"
            control={control}
            render={({ field, fieldState }) => (
              <TextField {...field} label={<>Name<ReqMark /></>} error={fieldState.error?.message} />
            )}
          />
          <Controller
            name="phone"
            control={control}
            render={({ field, fieldState }) => (
              <TextField {...field} label="Phone" error={fieldState.error?.message} />
            )}
          />
          <Controller
            name="email"
            control={control}
            render={({ field, fieldState }) => (
              <EmailField {...field} label="Email" error={fieldState.error?.message} />
            )}
          />
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <SelectField
                name="status"
                label="Status"
                data={LEAD_STATUSES.map((s) => ({ value: s, label: LEAD_STATUS_LABELS[s] }))}
                value={field.value}
                onChange={(v) => field.onChange(v ?? "new")}
              />
            )}
          />
          <div className="sm:col-span-2">
            <Controller
              name="assignedAgentId"
              control={control}
              render={({ field }) => (
                <SelectField
                  name="assignedAgentId"
                  label="Assign to agent"
                  placeholder="Unassigned"
                  clearable
                  data={agents.map((a) => ({ value: String(a.id), label: a.name }))}
                  value={field.value || null}
                  onChange={(v) => field.onChange(v ?? "")}
                />
              )}
            />
          </div>
          <div className="sm:col-span-2">
            <Controller
              name="notes"
              control={control}
              render={({ field, fieldState }) => (
                <TextareaField {...field} label="Notes" autosize minRows={3} error={fieldState.error?.message} />
              )}
            />
          </div>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button type="button" onClick={onClose} disabled={pending} className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={pending} className="inline-flex h-9 items-center gap-2 rounded-md bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-dark)] disabled:opacity-60">
              {pending ? <><Spinner />Saving…</> : isNew ? "Create lead" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function CrmLeadsBrowser({ agents }: { agents: AgentOption[] }) {
  const [data, setData] = useState<LeadsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [agentFilter, setAgentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [createdFrom, setAssignedFrom] = useState("");
  const [createdTo, setAssignedTo] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftAgent, setDraftAgent] = useState("");
  const [draftStatus, setDraftStatus] = useState("");
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [modal, setModal] = useState<{ open: boolean; lead: LeadRow | null }>({ open: false, lead: null });
  const [importOpen, setImportOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const sp = new URLSearchParams({ page: String(page), limit: String(perPage) });
      if (q) sp.set("q", q);
      if (agentFilter) sp.set("agent", agentFilter);
      if (statusFilter) sp.set("status", statusFilter);
      if (createdFrom) sp.set("createdFrom", createdFrom);
      if (createdTo) sp.set("createdTo", createdTo);
      const res = await fetch(`/api/crm/leads?${sp}`);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed to load leads");
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load leads");
    } finally {
      setLoading(false);
    }
  }, [q, agentFilter, statusFilter, createdFrom, createdTo, page, perPage]);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  async function saveField(lead: LeadRow, patch: Parameters<typeof updateLead>[1]) {
    const res = await updateLead(lead.id, patch);
    if (!res.error) load();
    return res;
  }

  const columns: DataTableColumn<LeadRow>[] = [
    {
      header: "Name",
      className: "whitespace-nowrap",
      cell: (l) => <EditableText value={l.name} onSave={(v) => saveField(l, { name: v })} className="font-medium" />,
    },
    {
      header: "Phone",
      className: "whitespace-nowrap",
      cell: (l) => <EditableText value={l.phone} onSave={(v) => saveField(l, { phone: v || null })} />,
    },
    {
      header: "Email",
      className: "whitespace-nowrap",
      cell: (l) => <EditableText value={l.email} onSave={(v) => saveField(l, { email: v || null })} />,
    },
    {
      header: "Agent",
      className: "whitespace-nowrap",
      cell: (l) => <span className="text-sm">{l.agentName ?? "-"}</span>,
    },
    {
      header: "Status",
      className: "whitespace-nowrap",
      cell: (l) => (
        <AppSelect
          className="w-36"
          value={l.status}
          onChange={async (v) => {
            if (!v) return;
            const res = await updateLead(l.id, { status: v });
            if (res.error) notify.error(res.error);
            else load();
          }}
          data={LEAD_STATUSES.map((s) => ({ value: s, label: LEAD_STATUS_LABELS[s] }))}
        />
      ),
    },
    {
      header: "Account created",
      className: "whitespace-nowrap",
      cell: (l) => (
        <input
          type="checkbox"
          checked={l.accountCreated}
          onChange={async (e) => {
            const res = await updateLead(l.id, { accountCreated: e.target.checked });
            if (res.error) notify.error(res.error);
            else load();
          }}
          className="h-4 w-4 accent-[var(--primary)]"
        />
      ),
    },
    {
      header: "Notes",
      className: "min-w-[200px]",
      cell: (l) => (
        <span className="line-clamp-2 block max-w-[220px] text-sm text-slate-600" title={l.notes ?? undefined}>
          {l.notes || <span className="text-slate-400">-</span>}
        </span>
      ),
    },
    { header: "Updated", className: "whitespace-nowrap", cell: (l) => <span className="muted text-sm">{fmtDate(l.updatedAt)}</span> },
    {
      header: "",
      className: "whitespace-nowrap",
      cell: (l) => (
        <button
          type="button"
          onClick={() => setModal({ open: true, lead: l })}
          className="inline-flex h-8 items-center rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Edit
        </button>
      ),
    },
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Leads</h1>
          <p className="page-sub">{data ? `${data.total} lead${data.total === 1 ? "" : "s"}` : "Loading…"}</p>
        </div>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <SearchInput
          className="w-full max-w-xs"
          placeholder="Search"
          value={q}
          onSearch={(v) => { setQ(v); setPage(1); }}
        />
        <button
          type="button"
          onClick={() => {
            setDraftAgent(agentFilter);
            setDraftStatus(statusFilter);
            setDraftFrom(createdFrom);
            setDraftTo(createdTo);
            setFilterOpen(true);
          }}
          className="relative inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          <SlidersHorizontal size={14} /> Filters
          {(agentFilter || statusFilter || createdFrom || createdTo) && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--primary)] px-1 text-[10px] font-semibold text-white">
              {[agentFilter, statusFilter, createdFrom, createdTo].filter(Boolean).length}
            </span>
          )}
        </button>
        <div className="ml-auto flex items-center gap-2">
          {(() => {
            const exportQs = new URLSearchParams();
            if (q) exportQs.set("q", q);
            if (agentFilter) exportQs.set("agent", agentFilter);
            if (statusFilter) exportQs.set("status", statusFilter);
            if (createdFrom) exportQs.set("createdFrom", createdFrom);
            if (createdTo) exportQs.set("createdTo", createdTo);
            return (
              <a
                className={`inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium transition-colors ${
                  data && data.total === 0 ? "cursor-not-allowed text-slate-400" : "text-slate-700 hover:bg-slate-50"
                }`}
                href={`/api/crm/leads/export?${exportQs}`}
                onClick={(e) => {
                  if (!data || data.total === 0) {
                    e.preventDefault();
                    notify.error("No records to export");
                  }
                }}
              >
                <Download size={14} /> Export CSV
              </a>
            );
          })()}
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Upload size={14} /> Import
          </button>
          <button
            type="button"
            onClick={() => setModal({ open: true, lead: null })}
            className="inline-flex h-9 items-center rounded-md bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-dark)]"
          >
            + Add lead
          </button>
        </div>
      </div>

      {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}

      <div className="overflow-x-auto">
      <DataTable
        loading={loading}
        emptyMessage="No leads yet. Add a lead or approve agent requests."
        rowKey={(l) => l.id}
        rows={data?.leads ?? []}
        footer={data && data.total >= 10 ? (
          <Pagination
            page={data.page}
            pages={data.pages}
            total={data.total}
            perPage={data.perPage}
            onPage={setPage}
            onPerPageChange={(n) => { setPerPage(n); setPage(1); }}
          />
        ) : null}
        columns={columns}
      />
      </div>

      {modal.open && (
        <LeadFormModal
          lead={modal.lead}
          agents={agents}
          onClose={() => setModal({ open: false, lead: null })}
          onDone={load}
        />
      )}
      {importOpen && (
        <ImportLeadsModal agents={agents} onClose={() => setImportOpen(false)} onDone={load} />
      )}

      <Drawer
        opened={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filters"
        position="right"
        size={340}
      >
        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-700">Agent</p>
            <AppSelect
              value={draftAgent || ALL}
              onChange={(v) => setDraftAgent(v === ALL ? "" : v ?? "")}
              data={[
                { value: ALL, label: "All agents" },
                { value: "unassigned", label: "Not assigned" },
                ...agents.map((a) => ({ value: String(a.id), label: a.name })),
              ]}
            />
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-700">Status</p>
            <AppSelect
              value={draftStatus || ALL}
              onChange={(v) => setDraftStatus(v === ALL ? "" : v ?? "")}
              data={[{ value: ALL, label: "All statuses" }, ...LEAD_STATUSES.map((s) => ({ value: s, label: LEAD_STATUS_LABELS[s] }))]}
            />
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-700">Created date</p>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={draftFrom}
                onChange={(e) => setDraftFrom(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-700"
              />
              <span className="text-sm text-slate-400">to</span>
              <input
                type="date"
                value={draftTo}
                onChange={(e) => setDraftTo(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-700"
              />
            </div>
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setDraftAgent("");
                setDraftStatus("");
                setDraftFrom("");
                setDraftTo("");
              }}
              className="inline-flex h-9 flex-1 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                setAgentFilter(draftAgent);
                setStatusFilter(draftStatus);
                setAssignedFrom(draftFrom);
                setAssignedTo(draftTo);
                setPage(1);
                setFilterOpen(false);
              }}
              className="inline-flex h-9 flex-1 items-center justify-center rounded-md bg-[var(--primary)] px-3 text-sm font-medium text-white hover:bg-[var(--primary-dark)]"
            >
              Apply
            </button>
          </div>
        </div>
      </Drawer>
    </>
  );
}
