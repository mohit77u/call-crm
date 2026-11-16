"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { freeTrialFormSchema, type FreeTrialFormValues } from "@/lib/validation";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { TextField, ReqMark } from "@/components/fields";
import { SearchInput } from "@/components/search-input";
import { Spinner } from "@/components/spinner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { notify } from "@/lib/notify";
import { createTrial, updateTrial, deleteTrial } from "./actions";

export type TrialRow = {
  id: number;
  name: string;
  phone: string;
  days: number;
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

function TrialFormModal({
  trial,
  onClose,
  onDone,
}: {
  trial: TrialRow | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const isNew = trial === null;
  const { control, handleSubmit, reset } = useForm<FreeTrialFormValues>({
    resolver: zodResolver(freeTrialFormSchema),
    defaultValues: { name: "", phone: "", days: "" },
  });

  useEffect(() => {
    reset(trial ? { name: trial.name, phone: trial.phone, days: String(trial.days) } : { name: "", phone: "", days: "" });
  }, [trial, reset]);

  if (isNew && trial !== null) return null;
  if (!isNew && trial === null) return null;

  function onValid(data: FreeTrialFormValues) {
    startTransition(async () => {
      const res = isNew
        ? await createTrial({ name: data.name.trim(), phone: data.phone.trim(), days: Number(data.days) })
        : await updateTrial(trial!.id, { name: data.name.trim(), phone: data.phone.trim(), days: Number(data.days) });
      if (res.error) notify.error(res.error);
      else {
        notify.success(res.notice ?? "Saved");
        onDone();
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => !pending && onClose()}>
      <div className="relative w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <span role="button" aria-label="Close" onClick={() => !pending && onClose()} className="absolute right-3 top-3 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          <X size={16} />
        </span>
        <h3 className="mb-4 pr-6 text-base font-semibold text-slate-900">{isNew ? "Add free trial" : "Edit free trial"}</h3>
        <form onSubmit={handleSubmit(onValid)} className="grid grid-cols-1 gap-3">
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
          <Controller
            name="days"
            control={control}
            render={({ field, fieldState }) => (
              <TextField {...field} type="text" inputMode="numeric" maxLength={1} label={<>Days<ReqMark /></>} placeholder="1-7" error={fieldState.error?.message} />
            )}
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={pending} className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={pending} className="inline-flex h-9 items-center gap-2 rounded-md bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-dark)] disabled:opacity-60">
              {pending ? <><Spinner />Saving…</> : isNew ? "Add" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AgentTrialsBrowser() {
  const [trials, setTrials] = useState<TrialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [modal, setModal] = useState<{ open: boolean; trial: TrialRow | null }>({ open: false, trial: null });
  const [deleteTarget, setDeleteTarget] = useState<TrialRow | null>(null);
  const [deletePending, startDeleteTransition] = useTransition();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/agent/trials");
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
    (t) => !q || t.name.toLowerCase().includes(q.toLowerCase()) || t.phone.includes(q),
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
    {
      header: "",
      className: "sticky right-0 z-10 min-w-[88px] bg-white",
      cell: (t) => (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setModal({ open: true, trial: t })}
            aria-label="Edit free trial"
            title="Edit"
            className="inline-flex items-center justify-center rounded-md bg-slate-200 p-2.5 text-slate-700 transition-colors hover:bg-slate-300"
          >
            <Pencil size={12} strokeWidth={2.2} color="#334155" />
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget(t)}
            aria-label="Delete free trial"
            title="Delete"
            className="inline-flex items-center justify-center rounded-md bg-red-50 p-2.5 text-red-500 transition-colors hover:bg-red-100"
          >
            <Trash2 size={12} strokeWidth={2.2} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Free trial</h1>
          <p className="page-sub">{trials.length} free trial{trials.length === 1 ? "" : "s"}</p>
        </div>
      </div>

      <div className="mb-2 flex items-center gap-2">
        <SearchInput className="w-full max-w-xs" placeholder="Search" value={q} onSearch={setQ} />
        <button
          type="button"
          onClick={() => setModal({ open: true, trial: null })}
          className="ml-auto inline-flex h-9 items-center rounded-md bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-dark)]"
        >
          + Add free trial
        </button>
      </div>

      {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}

      <DataTable
        loading={loading}
        emptyMessage="No free trials yet. Click '+ Add free trial' to add one."
        rowKey={(t) => t.id}
        rows={filtered}
        columns={columns}
      />

      {modal.open && (
        <TrialFormModal
          trial={modal.trial}
          onClose={() => setModal({ open: false, trial: null })}
          onDone={() => {
            setModal({ open: false, trial: null });
            load();
          }}
        />
      )}
      <ConfirmDialog
        open={deleteTarget != null}
        onClose={() => setDeleteTarget(null)}
        title="Delete free trial?"
        message={deleteTarget ? `Delete free trial for "${deleteTarget.name}"?` : undefined}
        confirmLabel="Delete"
        danger
        pending={deletePending}
        onConfirm={() => {
          if (!deleteTarget) return;
          startDeleteTransition(async () => {
            const res = await deleteTrial(deleteTarget.id);
            setDeleteTarget(null);
            if (res.error) notify.error(res.error);
            else {
              notify.success(res.notice ?? "Free trial deleted");
              setTrials((prev) => prev.filter((t) => t.id !== deleteTarget.id));
            }
          });
        }}
      />
    </>
  );
}
