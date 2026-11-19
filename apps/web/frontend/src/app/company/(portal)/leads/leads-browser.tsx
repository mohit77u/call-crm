"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Download, Upload, X, SlidersHorizontal, Pencil, Trash2, UserPlus, ChevronDown } from "lucide-react";
import { Tooltip } from "@mantine/core";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { leadFormSchema, assignLeadsSchema, type LeadFormValues, type AssignLeadsValues } from "@/lib/validation";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, leadStatusLabel, type LeadRow } from "@/lib/leads";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { Pagination } from "@/components/pagination";
import { SearchInput } from "@/components/search-input";
import { TextField, EmailField, TextareaField, SelectField, ReqMark } from "@/components/fields";
import { AppSelect } from "@/components/app-select";
import { Spinner } from "@/components/spinner";
import { notify } from "@/lib/notify";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { createLead, updateLead, deleteLead, deleteLeadsBulk, assignLeadsToAgent } from "./actions";
import { ImportLeadsModal } from "./import-modal";

type AgentOption = { id: number; name: string; active?: boolean };
type LeadsResponse = { leads: LeadRow[]; total: number; page: number; pages: number; perPage: number };

function fmtDate(s: string | null) {
  if (!s) return "-";
  return new Date(s).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const ALL = "__all";

const STATUS_PILL: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-cyan-100 text-cyan-700",
  interested: "bg-violet-100 text-violet-700",
  follow_up: "bg-amber-100 text-amber-700",
  converted: "bg-green-100 text-green-700",
  lost: "bg-red-100 text-red-700",
  do_not_call: "bg-slate-200 text-slate-600",
};

function fmtPhone(p: string | null) {
  const d = (p ?? "").replace(/\D/g, "");
  return d ? d.slice(-10) : "";
}

function NotesCell({ notes }: { notes: string | null }) {
  if (!notes) return <span className="text-sm text-slate-400">-</span>;
  return (
    <Tooltip
      label={<span className="whitespace-pre-wrap break-words">{notes}</span>}
      multiline
      w="auto"
      maw={400}
      position="top"
      withArrow
      openDelay={200}
    >
      <span className="block w-full truncate text-sm text-slate-600">{notes}</span>
    </Tooltip>
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
              <TextField {...field} label={<>Name<ReqMark /></>} placeholder="Enter name" error={fieldState.error?.message} />
            )}
          />
          <Controller
            name="phone"
            control={control}
            render={({ field, fieldState }) => (
              <TextField {...field} label={<>Phone<ReqMark /></>} placeholder="10-digit phone number" error={fieldState.error?.message} />
            )}
          />
          <div className="sm:col-span-2">
            <Controller
              name="email"
              control={control}
              render={({ field, fieldState }) => (
                <EmailField {...field} label="Email" error={fieldState.error?.message} />
              )}
            />
          </div>
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <SelectField
                name="status"
                label="Status"
                placeholder="Select status"
                data={LEAD_STATUSES.map((s) => ({ value: s, label: LEAD_STATUS_LABELS[s] }))}
                value={field.value}
                onChange={(v) => field.onChange(v ?? "new")}
              />
            )}
          />
          <div>
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
                <TextareaField {...field} label="Notes" placeholder="Add notes" autosize minRows={3} error={fieldState.error?.message} />
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

function AssignLeadsModal({ agents, selectedIds, onClose, onDone }: { agents: AgentOption[]; selectedIds: number[]; onClose: () => void; onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  const selectedCount = selectedIds.length;
  const { control, handleSubmit, reset } = useForm<AssignLeadsValues>({
    resolver: zodResolver(assignLeadsSchema),
    defaultValues: { count: selectedCount > 0 ? String(selectedCount) : "", agentId: "" },
  });

  useEffect(() => {
    reset({ count: selectedCount > 0 ? String(selectedCount) : "", agentId: "" });
  }, [reset, selectedCount]);

  function onValid(data: AssignLeadsValues) {
    const count = Number(data.count);
    const agentId = Number(data.agentId);
    startTransition(async () => {
      const res = await assignLeadsToAgent({ count, agentId, leadIds: selectedCount > 0 ? selectedIds : undefined });
      if (res.error) {
        notify.error(res.error);
        return;
      }
      const agentName = agents.find((a) => a.id === agentId)?.name ?? "agent";
      const assigned = res.assigned ?? 0;
      const requested = res.requested ?? count;
      notify.success(
        assigned < requested
          ? `Assigned ${assigned} of ${requested} leads to ${agentName} (only ${assigned} unassigned available)`
          : `Assigned ${assigned} lead${assigned === 1 ? "" : "s"} to ${agentName}`,
      );
      onDone();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => !pending && onClose()}>
      <div className="relative w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
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
        <h3 className="mb-1 pr-6 text-base font-semibold text-slate-900">Assign leads to agent</h3>
        <p className="mb-4 text-sm text-slate-500">
          {selectedCount > 0
            ? `${selectedCount} selected lead${selectedCount === 1 ? "" : "s"} will be assigned.`
            : "Randomly assigns unassigned leads. If fewer are available, all of them are assigned."}
        </p>
        <form onSubmit={handleSubmit(onValid)} className="grid grid-cols-1 gap-3">
          <Controller
            name="count"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                type="number"
                min={1}
                readOnly={selectedCount > 0}
                label={selectedCount > 0 ? "Selected leads" : <>How many leads<ReqMark /></>}
                placeholder="e.g. 20"
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            name="agentId"
            control={control}
            render={({ field, fieldState }) => (
              <SelectField
                name="agentId"
                label={<>Assign to agent<ReqMark /></>}
                placeholder="Select agent"
                data={agents.map((a) => ({ value: String(a.id), label: a.name }))}
                value={field.value || null}
                onChange={(v) => field.onChange(v ?? "")}
                error={fieldState.error?.message}
              />
            )}
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={pending} className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={pending} className="inline-flex h-9 items-center gap-2 rounded-md bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-dark)] disabled:opacity-60">
              {pending ? <><Spinner />Assigning…</> : "Assign"}
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
  const [accountCreated, setAccountCreated] = useState("");
  const [createdFrom, setAssignedFrom] = useState("");
  const [createdTo, setAssignedTo] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftAgent, setDraftAgent] = useState("");
  const [draftStatus, setDraftStatus] = useState("");
  const [draftAccountCreated, setDraftAccountCreated] = useState("");
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [modal, setModal] = useState<{ open: boolean; lead: LeadRow | null }>({ open: false, lead: null });
  const [importOpen, setImportOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LeadRow | null>(null);
  const [bulkDelete, setBulkDelete] = useState<"selected" | "all" | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const bulkRef = useRef<HTMLDivElement>(null);
  const [deletePending, startDeleteTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const sp = new URLSearchParams({ page: String(page), limit: String(perPage) });
      if (q) sp.set("q", q);
      if (agentFilter) sp.set("agent", agentFilter);
      if (statusFilter) sp.set("status", statusFilter);
      if (accountCreated) sp.set("accountCreated", accountCreated);
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
  }, [q, agentFilter, statusFilter, accountCreated, createdFrom, createdTo, page, perPage]);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  // Refresh table when a notification links back to this page.
  useEffect(() => {
    const handler = () => load();
    window.addEventListener("crm:data-refresh", handler);
    return () => window.removeEventListener("crm:data-refresh", handler);
  }, [load]);

  // Close the bulk-actions dropdown on outside click / Escape.
  useEffect(() => {
    if (!bulkOpen) return;
    const onDown = (e: MouseEvent) => {
      if (bulkRef.current && !bulkRef.current.contains(e.target as Node)) setBulkOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBulkOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [bulkOpen]);

  const pageRows = data?.leads ?? [];
  const allPageSelected = pageRows.length > 0 && pageRows.every((l) => selectedIds.has(l.id));

  const toggleAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) pageRows.forEach((l) => next.delete(l.id));
      else pageRows.forEach((l) => next.add(l.id));
      return next;
    });
  };

  const toggleOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const columns: DataTableColumn<LeadRow>[] = [
    {
      header: (
        <input
          type="checkbox"
          aria-label="Select all leads"
          checked={allPageSelected}
          disabled={pageRows.length === 0}
          onChange={toggleAll}
          className="h-4 w-4 accent-[var(--primary)]"
        />
      ),
      className: "w-10",
      cell: (l) => (
        <input
          type="checkbox"
          aria-label={`Select ${l.name}`}
          checked={selectedIds.has(l.id)}
          onChange={() => toggleOne(l.id)}
          className="h-4 w-4 accent-[var(--primary)]"
        />
      ),
    },
    {
      header: "Name",
      className: "w-[190px] max-w-[190px] whitespace-nowrap",
      cell: (l) => (
        <Tooltip label={l.name} multiline w="auto" maw={340} position="top" withArrow openDelay={200} disabled={!l.name}>
          <span className="block w-full truncate text-sm font-medium">{l.name}</span>
        </Tooltip>
      ),
    },
    {
      header: "Phone",
      className: "w-[140px] max-w-[140px] whitespace-nowrap",
      cell: (l) => {
        const phone = fmtPhone(l.phone);
        return <span className="block w-full truncate text-sm">{phone || <span className="text-slate-400">-</span>}</span>;
      },
    },
    {
      header: "Email",
      className: "w-[240px] max-w-[240px] whitespace-nowrap",
      cell: (l) =>
        l.email ? (
          <Tooltip label={l.email} multiline w="auto" maw={520} position="top" withArrow openDelay={200}>
            <span className="block w-full truncate text-sm">{l.email}</span>
          </Tooltip>
        ) : (
          <span className="text-sm text-slate-400">-</span>
        ),
    },
    {
      header: "Agent",
      className: "min-w-[120px] whitespace-nowrap",
      cell: (l) => <span className="text-sm">{l.agentName ?? <span className="text-slate-400">-</span>}</span>,
    },
    {
      header: "Notes",
      className: "w-[240px] max-w-[240px] whitespace-nowrap",
      cell: (l) => <NotesCell notes={l.notes} />,
    },
    {
      header: "Status",
      className: "min-w-[120px] whitespace-nowrap",
      cell: (l) => (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-normal ${STATUS_PILL[l.status] ?? "bg-slate-100 text-slate-600"}`}>
          {leadStatusLabel(l.status)}
        </span>
      ),
    },
    {
      header: "Account created",
      className: "min-w-[110px] whitespace-nowrap",
      cell: (l) =>
        l.accountCreated ? (
          <span className="text-sm font-medium text-green-600">Yes</span>
        ) : (
          <span className="text-sm font-medium text-red-500">No</span>
        ),
    },
    { header: "Created", className: "min-w-[130px] whitespace-nowrap", cell: (l) => <span className="muted text-sm">{fmtDate(l.createdAt)}</span> },
    { header: "Updated", className: "min-w-[130px] whitespace-nowrap", cell: (l) => <span className="muted text-sm">{fmtDate(l.updatedAt)}</span> },
    {
      header: "",
      className: "sticky right-0 z-10 min-w-[96px] bg-white",
      cell: (l) => (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setModal({ open: true, lead: l })}
            aria-label="Edit lead"
            title="Edit"
            className="inline-flex items-center justify-center rounded-md bg-slate-200 p-2.5 text-slate-700 transition-colors hover:bg-slate-300"
          >
            <Pencil size={12} strokeWidth={2.2} color="#334155" />
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget(l)}
            aria-label="Delete lead"
            title="Delete"
            className="inline-flex items-center justify-center rounded-md bg-red-50 p-2.5 text-red-500 transition-colors hover:bg-red-100"
          >
            <Trash2 size={12} strokeWidth={2.2} />
          </button>
        </div>
      ),
    },
  ];

  const appliedCount = [agentFilter, statusFilter, accountCreated, createdFrom, createdTo].filter(Boolean).length;
  const selectedPageIds = pageRows.filter((l) => selectedIds.has(l.id)).map((l) => l.id);

  const openFilter = () => {
    setDraftAgent(agentFilter);
    setDraftStatus(statusFilter);
    setDraftAccountCreated(accountCreated);
    setDraftFrom(createdFrom);
    setDraftTo(createdTo);
    setFilterOpen(true);
  };

  const applyFilters = () => {
    setAgentFilter(draftAgent);
    setStatusFilter(draftStatus);
    setAccountCreated(draftAccountCreated);
    setAssignedFrom(draftFrom);
    setAssignedTo(draftTo);
    setPage(1);
    setFilterOpen(false);
  };

  const clearFilters = () => {
    setDraftAgent("");
    setDraftStatus("");
    setDraftAccountCreated("");
    setDraftFrom("");
    setDraftTo("");
    setAgentFilter("");
    setStatusFilter("");
    setAccountCreated("");
    setAssignedFrom("");
    setAssignedTo("");
    setPage(1);
    setFilterOpen(false);
  };

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
          className="w-full sm:max-w-xs"
          placeholder="Search"
          value={q}
          onSearch={(v) => { setQ(v); setPage(1); }}
        />
        <button
          type="button"
          onClick={openFilter}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          <SlidersHorizontal size={14} /> Filters
          {appliedCount > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--primary)] px-1 text-[11px] font-semibold text-white">
              {appliedCount}
            </span>
          )}
        </button>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div ref={bulkRef} className="relative">
            <button
              type="button"
              onClick={() => setBulkOpen((o) => !o)}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Bulk actions
              {selectedIds.size > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-600 px-1 text-[11px] font-semibold text-white">
                  {selectedIds.size}
                </span>
              )}
              <ChevronDown size={14} className="text-slate-400" />
            </button>
            {bulkOpen && (
              <div className="absolute right-0 top-full z-40 mt-1 w-52 overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  disabled={!data || data.total === 0}
                  onClick={() => { setBulkOpen(false); setAssignOpen(true); }}
                  className="flex w-full items-center gap-2 bg-transparent px-3 py-1.5 text-left text-[13px] text-slate-600 shadow-none hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <UserPlus size={14} className="text-slate-400" />
                  {selectedPageIds.length > 0 ? `Assign selected (${selectedPageIds.length})` : "Assign to agent"}
                </button>
                <button
                  type="button"
                  disabled={selectedIds.size === 0}
                  onClick={() => { setBulkOpen(false); setBulkDelete("selected"); }}
                  className="flex w-full items-center gap-2 bg-transparent px-3 py-1.5 text-left text-[13px] text-slate-600 shadow-none hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 size={14} className="text-slate-400" />
                  Delete selected{selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
                </button>
                <button
                  type="button"
                  disabled={!data || data.total === 0}
                  onClick={() => { setBulkOpen(false); setBulkDelete("all"); }}
                  className="flex w-full items-center gap-2 bg-transparent px-3 py-1.5 text-left text-[13px] text-red-500 shadow-none hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 size={14} className="text-red-400" />
                  Delete all
                </button>
              </div>
            )}
          </div>
          {(() => {
            const exportQs = new URLSearchParams();
            if (q) exportQs.set("q", q);
            if (agentFilter) exportQs.set("agent", agentFilter);
            if (statusFilter) exportQs.set("status", statusFilter);
            if (accountCreated) exportQs.set("accountCreated", accountCreated);
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
        columns={columns}
      />
      </div>

      {data && data.total >= 10 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <Pagination
            page={data.page}
            pages={data.pages}
            total={data.total}
            perPage={data.perPage}
            onPage={setPage}
            onPerPageChange={(n) => { setPerPage(n); setPage(1); }}
          />
        </div>
      )}

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
      {assignOpen && (
        <AssignLeadsModal
          agents={agents}
          selectedIds={selectedPageIds}
          onClose={() => setAssignOpen(false)}
          onDone={() => {
            setSelectedIds(new Set());
            load();
          }}
        />
      )}
      <ConfirmDialog
        open={deleteTarget != null}
        onClose={() => setDeleteTarget(null)}
        title="Delete lead?"
        message={deleteTarget ? `Delete "${deleteTarget.name}"? This cannot be undone.` : undefined}
        confirmLabel="Delete"
        danger
        pending={deletePending}
        onConfirm={() => {
          if (!deleteTarget) return;
          startDeleteTransition(async () => {
            const res = await deleteLead(deleteTarget.id);
            setDeleteTarget(null);
            if (res.error) notify.error(res.error);
            else {
              notify.success(res.notice ?? "Lead deleted");
              load();
            }
          });
        }}
      />

      <ConfirmDialog
        open={bulkDelete != null}
        onClose={() => setBulkDelete(null)}
        title={bulkDelete === "all" ? "Delete all leads?" : "Delete selected leads?"}
        message={
          bulkDelete === "all"
            ? `This will delete ALL ${data?.total ?? 0} leads. This cannot be undone.`
            : `Delete ${selectedIds.size} selected lead${selectedIds.size === 1 ? "" : "s"}? This cannot be undone.`
        }
        confirmLabel="Delete"
        danger
        pending={deletePending}
        onConfirm={() => {
          if (!bulkDelete) return;
          startDeleteTransition(async () => {
            const res = await deleteLeadsBulk(bulkDelete === "all" ? { all: true } : { ids: [...selectedIds] });
            setBulkDelete(null);
            if (res.error) notify.error(res.error);
            else {
              notify.success(res.notice ?? "Leads deleted");
              setSelectedIds(new Set());
              load();
            }
          });
        }}
      />

      {filterOpen && (
        <>
          <div className="drawer-backdrop" onClick={() => setFilterOpen(false)} />
          <aside className="drawer">
            <div className="drawer-head">
              <h2>Filters</h2>
              <button type="button" className="drawer-close" onClick={() => setFilterOpen(false)}>✕</button>
            </div>
            <div className="drawer-body">
              <label className="drawer-field">
                <span>Agent</span>
                <AppSelect
                  value={draftAgent || ALL}
                  onChange={(v) => setDraftAgent(v === ALL ? "" : v ?? "")}
                  data={[
                    { value: ALL, label: "All agents" },
                    { value: "unassigned", label: "Not assigned" },
                    ...agents.map((a) => ({ value: String(a.id), label: a.name })),
                  ]}
                />
              </label>
              <label className="drawer-field">
                <span>Status</span>
                <AppSelect
                  value={draftStatus || ALL}
                  onChange={(v) => setDraftStatus(v === ALL ? "" : v ?? "")}
                  data={[{ value: ALL, label: "All statuses" }, ...LEAD_STATUSES.map((s) => ({ value: s, label: LEAD_STATUS_LABELS[s] }))]}
                />
              </label>
              <label className="drawer-field">
                <span>Account created</span>
                <AppSelect
                  value={draftAccountCreated || ALL}
                  onChange={(v) => setDraftAccountCreated(v === ALL ? "" : v ?? "")}
                  data={[
                    { value: ALL, label: "All" },
                    { value: "yes", label: "Yes" },
                    { value: "no", label: "No" },
                  ]}
                />
              </label>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Created date</p>
              <label className="drawer-field">
                <span>From</span>
                <input
                  type="date"
                  value={draftFrom}
                  onChange={(e) => setDraftFrom(e.target.value)}
                />
              </label>
              <label className="drawer-field">
                <span>To</span>
                <input
                  type="date"
                  value={draftTo}
                  onChange={(e) => setDraftTo(e.target.value)}
                />
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
