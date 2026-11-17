"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Pencil, X } from "lucide-react";
import { Tooltip } from "@mantine/core";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { leadFormSchema, type LeadFormValues } from "@/lib/validation";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, leadStatusLabel, type LeadRow } from "@/lib/leads";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { TextField, EmailField, TextareaField, SelectField, ReqMark } from "@/components/fields";
import { AppSelect } from "@/components/app-select";
import { SearchInput } from "@/components/search-input";
import { Spinner } from "@/components/spinner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { notify } from "@/lib/notify";
import { requestLeads, updateAgentLead } from "./actions";

function fmtDate(s: string | null) {
  if (!s) return "-";
  return new Date(s).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const requireName = (v: string) => (v ? null : "Name is required");
const optionalPhone = (v: string) => (!v || v.replace(/\D/g, "").length >= 10 ? null : "Enter a valid phone number");
const optionalEmail = (v: string) => (!v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : "Enter a valid email");

function EditableText({
  value,
  onSave,
  placeholder = "-",
  className = "",
  inputClassName = "w-44",
  validate,
}: {
  value: string | null;
  onSave: (v: string) => Promise<{ error?: string }>;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  validate?: (v: string) => string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [pending, startTransition] = useTransition();

  function commit() {
    const next = draft.trim();
    if (next === (value ?? "").trim()) {
      setEditing(false);
      return;
    }
    const err = validate?.(next);
    if (err) {
      notify.error(err);
      return;
    }
    setEditing(false);
    startTransition(async () => {
      await onSave(next);
    });
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
        className={`h-8 rounded-md border border-[var(--primary)] bg-white px-2 text-sm text-slate-800 shadow-sm outline-none ${inputClassName}`}
      />
    );
  }
  return (
    <span
      onClick={() => {
        setDraft(value ?? "");
        setEditing(true);
      }}
      className={`block w-full cursor-text truncate rounded px-1 py-1 text-sm ${className}`}
      title={value ?? undefined}
    >
      {value || <span className="text-slate-400">{placeholder}</span>}
    </span>
  );
}

const STATUS_PILL: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-cyan-100 text-cyan-700",
  interested: "bg-violet-100 text-violet-700",
  follow_up: "bg-amber-100 text-amber-700",
  converted: "bg-green-100 text-green-700",
  lost: "bg-red-100 text-red-700",
  do_not_call: "bg-slate-200 text-slate-600",
};

function StatusCell({ lead, onSave }: { lead: LeadRow; onSave: (v: string) => Promise<{ error?: string }> }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editing) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (wrapRef.current && !wrapRef.current.contains(t) && !(t as Element).closest?.(".mantine-Select-dropdown")) {
        setEditing(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [editing]);

  if (editing) {
    return (
      <div ref={wrapRef}>
        <AppSelect
          className="w-36"
          disabled={pending}
          defaultDropdownOpened
          value={lead.status}
          onChange={(v) => {
            if (!v || v === lead.status) {
              setEditing(false);
              return;
            }
            setEditing(false);
            startTransition(async () => {
              await onSave(v);
            });
          }}
          data={LEAD_STATUSES.map((s) => ({ value: s, label: LEAD_STATUS_LABELS[s] }))}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={`inline-flex cursor-pointer items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_PILL[lead.status] ?? "bg-slate-100 text-slate-600"}`}
    >
      {leadStatusLabel(lead.status)}
    </button>
  );
}

function EditLeadModal({ lead, agents, onClose, onDone }: { lead: LeadRow | null; agents: { id: number; name: string }[]; onClose: () => void; onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  const {
    control,
    handleSubmit,
    reset,
  } = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: { name: "", phone: "", email: "", notes: "", status: "new", assignedAgentId: "" },
  });

  useEffect(() => {
    if (lead) {
      reset({
        name: lead.name,
        phone: lead.phone ?? "",
        email: lead.email ?? "",
        notes: lead.notes ?? "",
        status: lead.status,
        assignedAgentId: lead.assignedAgentId ? String(lead.assignedAgentId) : "",
      });
    }
  }, [lead, reset]);

  if (!lead) return null;

  function onValid(data: LeadFormValues) {
    startTransition(async () => {
      const res = await updateAgentLead(lead!.id, {
        name: data.name,
        phone: data.phone || null,
        email: data.email || null,
        notes: data.notes || null,
        status: data.status,
        accountCreated: undefined,
      });
      if (res.error) notify.error(res.error);
      else {
        notify.success(res.notice ?? "Lead updated");
        onDone();
        onClose();
      }
    });
  }

  void agents;

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
        <h3 className="mb-4 pr-6 text-base font-semibold text-slate-900">Edit lead</h3>
        <form onSubmit={handleSubmit(onValid)} className="flex flex-col gap-3">
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
          <Controller
            name="notes"
            control={control}
            render={({ field, fieldState }) => (
              <TextareaField {...field} label="Notes" autosize minRows={3} error={fieldState.error?.message} />
            )}
          />
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={pending} className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={pending} className="inline-flex h-9 items-center gap-2 rounded-md bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-dark)] disabled:opacity-60">
              {pending ? <><Spinner />Saving…</> : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NotesModal({ lead, onClose, onSave }: { lead: LeadRow | null; onClose: () => void; onSave: (notes: string) => Promise<{ error?: string }> }) {
  const [value, setValue] = useState(lead?.notes ?? "");
  const [pending, startTransition] = useTransition();

  if (!lead) return null;

  function submit() {
    if (value.length > 2000) {
      notify.error("Notes must be 2000 characters or less");
      return;
    }
    startTransition(async () => {
      const res = await onSave(value.trim());
      if (!res.error) onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => !pending && onClose()}>
      <div className="relative w-full max-w-md rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <span role="button" aria-label="Close" onClick={() => !pending && onClose()} className="absolute right-3 top-3 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          <X size={16} />
        </span>
        <h3 className="mb-1 pr-6 text-base font-semibold text-slate-900">Notes — {lead.name}</h3>
        <p className="mb-3 text-xs text-slate-400">{lead.phone ?? lead.email ?? ""}</p>
        <TextareaField name="notes" label="Notes" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Add notes" autosize minRows={4} maxRows={10} />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={pending} className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button type="button" onClick={submit} disabled={pending} className="inline-flex h-9 items-center gap-2 rounded-md bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-dark)] disabled:opacity-60">
            {pending ? <><Spinner />Saving…</> : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AgentLeadsBrowser() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestPending, startRequestTransition] = useTransition();
  const [editLead, setEditLead] = useState<LeadRow | null>(null);
  const [notesFor, setNotesFor] = useState<LeadRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/agent/leads");
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed to load leads");
      const data = await res.json();
      setLeads(data.leads ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load leads");
    } finally {
      setLoading(false);
    }
  }, []);

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

  const filtered = leads.filter(
    (l) =>
      !q ||
      l.name.toLowerCase().includes(q.toLowerCase()) ||
      (l.phone ?? "").includes(q) ||
      (l.email ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  const FIELD_LABELS: Record<string, string> = {
    name: "Name",
    phone: "Phone",
    email: "Email",
    notes: "Notes",
    status: "Status",
    accountCreated: "Account created",
  };

  async function saveField(lead: LeadRow, patch: Parameters<typeof updateAgentLead>[1]) {
    const res = await updateAgentLead(lead.id, patch);
    if (res.error) {
      notify.error(res.error);
      return res;
    }
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, ...patch, updatedAt: new Date().toISOString() } : l)));
    const key = Object.keys(patch)[0] ?? "";
    notify.success(`${lead.name} — ${FIELD_LABELS[key] ?? key} updated`);
    return res;
  }

  function sendRequest() {
    startRequestTransition(async () => {
      const res = await requestLeads();
      if (res.error) notify.error(res.error);
      else {
        notify.success(res.notice ?? "Request sent");
        setRequestOpen(false);
      }
    });
  }

  const columns: DataTableColumn<LeadRow>[] = [
    {
      header: "Name",
      className: "min-w-[200px] whitespace-nowrap",
      cell: (l) => <EditableText value={l.name} onSave={(v) => saveField(l, { name: v })} className="font-medium" inputClassName="w-44" validate={requireName} />,
    },
    {
      header: "Phone",
      className: "min-w-[150px] whitespace-nowrap",
      cell: (l) => <EditableText value={l.phone} onSave={(v) => saveField(l, { phone: v || null })} inputClassName="w-32" validate={optionalPhone} />,
    },
    {
      header: "Email",
      className: "min-w-[235px] whitespace-nowrap",
      cell: (l) => <EditableText value={l.email} onSave={(v) => saveField(l, { email: v || null })} inputClassName="w-52" validate={optionalEmail} />,
    },
    {
      header: "Status",
      cell: (l) => <StatusCell lead={l} onSave={(v) => saveField(l, { status: v })} />,
    },
    {
      header: "Account created",
      className: "min-w-[110px] whitespace-nowrap",
      cell: (l) => (
        <input
          type="checkbox"
          checked={l.accountCreated}
          onChange={(e) => saveField(l, { accountCreated: e.target.checked })}
          className="h-4 w-4 accent-[var(--primary)]"
        />
      ),
    },
    {
      header: "Notes",
      className: "min-w-[180px]",
      cell: (l) =>
        l.notes ? (
          <Tooltip
            label={<span className="whitespace-pre-wrap break-words">{l.notes}</span>}
            multiline
            w={280}
            position="top"
            withArrow
            openDelay={200}
          >
            <span
              role="button"
              tabIndex={0}
              onClick={() => setNotesFor(l)}
              onKeyDown={(e) => e.key === "Enter" && setNotesFor(l)}
              className="line-clamp-2 block max-w-[220px] cursor-text break-words text-sm text-slate-600"
            >
              {l.notes}
            </span>
          </Tooltip>
        ) : (
          <span
            role="button"
            tabIndex={0}
            onClick={() => setNotesFor(l)}
            onKeyDown={(e) => e.key === "Enter" && setNotesFor(l)}
            className="cursor-text text-sm text-slate-400"
          >
            Add notes
          </span>
        ),
    },
    { header: "Created", className: "whitespace-nowrap", cell: (l) => <span className="muted text-sm">{fmtDate(l.createdAt)}</span> },
    { header: "Updated", className: "whitespace-nowrap", cell: (l) => <span className="muted text-sm">{fmtDate(l.updatedAt)}</span> },
    {
      header: "",
      className: "sticky right-0 z-10 min-w-[56px] bg-white",
      cell: (l) => (
        <button
          type="button"
          onClick={() => setEditLead(l)}
          aria-label="Edit lead"
          title="Edit"
          className="inline-flex items-center justify-center rounded-md bg-slate-200 p-2.5 text-slate-700 transition-colors hover:bg-slate-300"
        >
          <Pencil size={12} strokeWidth={2.2} color="#334155" />
        </button>
      ),
    },
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>My leads</h1>
          <p className="page-sub">{leads.length} assigned lead{leads.length === 1 ? "" : "s"}</p>
        </div>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <SearchInput className="w-full sm:max-w-xs" placeholder="Search" value={q} onSearch={setQ} />
        <button
          type="button"
          onClick={() => setRequestOpen(true)}
          className="ml-auto inline-flex h-9 items-center rounded-md bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-dark)]"
        >
          + Request leads
        </button>
      </div>

      {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}

      <DataTable
        loading={loading}
        emptyMessage="No leads assigned yet. Send a request to your admin."
        rowKey={(l) => l.id}
        rows={filtered}
        columns={columns}
      />

      <ConfirmDialog
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        title="Request leads"
        message="Send a lead request to your admin? They will decide how many leads to assign to you."
        confirmLabel="Send request"
        pending={requestPending}
        onConfirm={sendRequest}
      />
      <EditLeadModal lead={editLead} agents={[]} onClose={() => setEditLead(null)} onDone={load} />
      <NotesModal
        key={notesFor?.id ?? "closed"}
        lead={notesFor}
        onClose={() => setNotesFor(null)}
        onSave={(notes) => (notesFor ? saveField(notesFor, { notes: notes || null }) : Promise.resolve({}))}
      />
    </>
  );
}
