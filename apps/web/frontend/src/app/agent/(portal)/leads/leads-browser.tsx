"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { X } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { leadRequestSchema, leadFormSchema, type LeadRequestValues, type LeadFormValues } from "@/lib/validation";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, type LeadRow } from "@/lib/leads";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { TextField, EmailField, TextareaField, SelectField, ReqMark } from "@/components/fields";
import { AppSelect } from "@/components/app-select";
import { SearchInput } from "@/components/search-input";
import { Spinner } from "@/components/spinner";
import { notify } from "@/lib/notify";
import { createLeadRequest, updateAgentLead } from "./actions";

function fmtDate(s: string | null) {
  if (!s) return "-";
  return new Date(s).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function EditableText({
  value,
  onSave,
  placeholder = "-",
  className = "",
}: {
  value: string | null;
  onSave: (v: string) => Promise<{ error?: string }>;
  placeholder?: string;
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
      {value || <span className="text-slate-400">{placeholder}</span>}
    </span>
  );
}

function RequestLeadModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LeadRequestValues>({
    resolver: zodResolver(leadRequestSchema),
    defaultValues: { name: "", phone: "", email: "", notes: "" },
  });

  useEffect(() => {
    if (open) reset({ name: "", phone: "", email: "", notes: "" });
  }, [open, reset]);

  if (!open) return null;

  function onValid(data: LeadRequestValues) {
    startTransition(async () => {
      const res = await createLeadRequest({
        name: data.name,
        phone: data.phone || undefined,
        email: data.email || undefined,
        notes: data.notes || undefined,
      });
      if (res.error) notify.error(res.error);
      else {
        notify.success(res.notice ?? "Request sent");
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
        <h3 className="mb-4 pr-6 text-base font-semibold text-slate-900">Request a lead</h3>
        <form onSubmit={handleSubmit(onValid)} className="flex flex-col gap-3">
          <Controller
            name="name"
            control={control}
            render={({ field, fieldState }) => (
              <TextField {...field} label={<>Name<ReqMark /></>} placeholder="Lead name" error={fieldState.error?.message} />
            )}
          />
          <Controller
            name="phone"
            control={control}
            render={({ field, fieldState }) => (
              <TextField {...field} label="Phone" placeholder="Phone number" error={fieldState.error?.message} />
            )}
          />
          <Controller
            name="email"
            control={control}
            render={({ field, fieldState }) => (
              <EmailField {...field} label="Email" placeholder="Optional" error={fieldState.error?.message} />
            )}
          />
          <Controller
            name="notes"
            control={control}
            render={({ field, fieldState }) => (
              <TextareaField {...field} label="Notes" placeholder="Anything admin should know" error={fieldState.error?.message} autosize minRows={2} />
            )}
          />
          {errors.root && <p className="text-sm text-red-500">{errors.root.message}</p>}
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={pending} className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={pending} className="inline-flex h-9 items-center gap-2 rounded-md bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-dark)] disabled:opacity-60">
              {pending ? <><Spinner />Sending…</> : "Send request"}
            </button>
          </div>
        </form>
      </div>
    </div>
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

export function AgentLeadsBrowser() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [requestOpen, setRequestOpen] = useState(false);
  const [editLead, setEditLead] = useState<LeadRow | null>(null);

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

  const filtered = leads.filter(
    (l) =>
      !q ||
      l.name.toLowerCase().includes(q.toLowerCase()) ||
      (l.phone ?? "").includes(q) ||
      (l.email ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  async function saveField(lead: LeadRow, patch: Parameters<typeof updateAgentLead>[1]) {
    const res = await updateAgentLead(lead.id, patch);
    if (!res.error) load();
    return res;
  }

  const columns: DataTableColumn<LeadRow>[] = [
    {
      header: "Name",
      cell: (l) => <EditableText value={l.name} onSave={(v) => saveField(l, { name: v })} className="font-medium" />,
    },
    {
      header: "Phone",
      cell: (l) => <EditableText value={l.phone} onSave={(v) => saveField(l, { phone: v || null })} />,
    },
    {
      header: "Email",
      cell: (l) => <EditableText value={l.email} onSave={(v) => saveField(l, { email: v || null })} />,
    },
    {
      header: "Status",
      cell: (l) => (
        <AppSelect
          className="w-36"
          value={l.status}
          onChange={async (v) => {
            if (!v) return;
            const res = await updateAgentLead(l.id, { status: v });
            if (res.error) notify.error(res.error);
            else load();
          }}
          data={LEAD_STATUSES.map((s) => ({ value: s, label: LEAD_STATUS_LABELS[s] }))}
        />
      ),
    },
    {
      header: "Account created",
      cell: (l) => (
        <input
          type="checkbox"
          checked={l.accountCreated}
          onChange={async (e) => {
            const res = await updateAgentLead(l.id, { accountCreated: e.target.checked });
            if (res.error) notify.error(res.error);
            else load();
          }}
          className="h-4 w-4 accent-[var(--primary)]"
        />
      ),
    },
    {
      header: "Notes",
      cell: (l) => (
        <span className="line-clamp-2 block max-w-[220px] text-sm text-slate-600" title={l.notes ?? undefined}>
          {l.notes || <span className="text-slate-400">-</span>}
        </span>
      ),
    },
    { header: "Updated", cell: (l) => <span className="muted text-sm">{fmtDate(l.updatedAt)}</span> },
    {
      header: "",
      cell: (l) => (
        <button
          type="button"
          onClick={() => setEditLead(l)}
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
          <h1>My leads</h1>
          <p className="page-sub">{leads.length} assigned lead{leads.length === 1 ? "" : "s"}</p>
        </div>
        <button
          type="button"
          onClick={() => setRequestOpen(true)}
          className="inline-flex h-9 items-center rounded-md bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-dark)]"
        >
          + Request lead
        </button>
      </div>

      <div className="mb-2">
        <SearchInput className="w-full max-w-xs" placeholder="Search" value={q} onSearch={setQ} />
      </div>

      {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}

      <DataTable
        loading={loading}
        emptyMessage="No leads assigned yet. Send a request to your admin."
        rowKey={(l) => l.id}
        rows={filtered}
        columns={columns}
      />

      <RequestLeadModal open={requestOpen} onClose={() => setRequestOpen(false)} onDone={load} />
      <EditLeadModal lead={editLead} agents={[]} onClose={() => setEditLead(null)} onDone={load} />
    </>
  );
}
