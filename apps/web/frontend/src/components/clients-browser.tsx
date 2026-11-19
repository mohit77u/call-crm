"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Download, FileSpreadsheet, Pencil, Plus, Trash2, Upload, Users, X } from "lucide-react";
import { Tooltip } from "@mantine/core";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { Pagination } from "@/components/pagination";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { SearchInput } from "@/components/search-input";
import { Spinner } from "@/components/spinner";
import { AppSelect } from "@/components/app-select";
import { TextField, EmailField, TextareaField, ReqMark } from "@/components/fields";
import { clientFormSchema, type ClientFormValues } from "@/lib/validation";
import { notify } from "@/lib/notify";
import type { ClientRow, AgentOption } from "@/lib/clients";

export type ClientActionResult = { error?: string; notice?: string };
export type ClientActions = {
  createClient: (input: Record<string, unknown>) => Promise<ClientActionResult>;
  updateClient: (id: number, patch: Record<string, unknown>) => Promise<ClientActionResult>;
  deleteClient: (id: number) => Promise<ClientActionResult>;
};

const PER_PAGE = 10;
const ALL = "__all__";

function ClampedText({
  text,
  display,
  capitalize = false,
  lines = 2,
  className = "text-slate-600",
}: {
  text?: string | null;
  display?: string | null;
  capitalize?: boolean;
  lines?: 1 | 2;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setTruncated(el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, display]);

  if (!text) return <span className="text-sm text-slate-400">-</span>;
  const shown = display ?? text;
  return (
    <Tooltip
      label={<span className={`whitespace-pre-wrap break-words ${capitalize ? "capitalize" : ""}`}>{shown}</span>}
      multiline
      w="auto"
      maw={400}
      position="top"
      withArrow
      openDelay={200}
      disabled={!truncated}
    >
      <span
        ref={ref}
        className={`text-sm ${lines === 1 ? "block truncate" : "line-clamp-2 whitespace-normal! wrap-anywhere"} ${capitalize ? "capitalize" : ""} ${className}`}
      >
        {shown}
      </span>
    </Tooltip>
  );
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function ClientFormModal({
  client,
  agents,
  showAgent,
  onClose,
  onSave,
}: {
  client: ClientRow | null;
  agents: AgentOption[];
  showAgent: boolean;
  onClose: () => void;
  onSave: (data: ClientFormValues) => Promise<ClientActionResult>;
}) {
  const [pending, startTransition] = useTransition();
  const { control, handleSubmit, register, formState: { errors } } = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      clientCode: client?.clientCode ?? "",
      name: client?.name ?? "",
      phone: client?.phone ?? "",
      email: client?.email ?? "",
      address: client?.address ?? "",
      panCard: client?.panCard ?? "",
      agentId: client?.agentId ?? null,
    },
  });

  const submit = handleSubmit((data) => {
    startTransition(async () => {
      const res = await onSave(data);
      if (!res.error) onClose();
    });
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => !pending && onClose()}>
      <form
        onSubmit={submit}
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <span role="button" aria-label="Close" onClick={() => !pending && onClose()} className="absolute right-3 top-3 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          <X size={16} />
        </span>
        <h3 className="mb-4 pr-6 text-base font-semibold text-slate-900">{client ? `Edit client — ${client.name}` : "Add client"}</h3>
        <div className="flex flex-col gap-3">
          <TextField {...register("name")} label={<>Name<ReqMark /></>} error={errors.name?.message} />
          <TextField {...register("phone")} label={<>Phone<ReqMark /></>} error={errors.phone?.message} placeholder="10-digit mobile" maxLength={10} inputMode="numeric" />
          <EmailField {...register("email")} label={<>Email<ReqMark /></>} error={errors.email?.message} />
          <div className="grid grid-cols-2 gap-3">
            <TextField {...register("clientCode")} label={<>Client code<ReqMark /></>} error={errors.clientCode?.message} placeholder="e.g. C-1001" maxLength={20} />
            <TextField {...register("panCard")} label="Pan card" error={errors.panCard?.message} placeholder="ABCDE1234F" maxLength={20} />
          </div>
          <TextareaField {...register("address")} label="Address" error={errors.address?.message} autosize minRows={2} maxRows={4} />
          {showAgent ? (
            <Controller
              control={control}
              name="agentId"
              render={({ field }) => (
                <AppSelect
                  label="Agent"
                  value={field.value != null ? String(field.value) : null}
                  onChange={(v) => field.onChange(v ? Number(v) : null)}
                  data={[
                    { value: "", label: "— My clients (-) —" },
                    ...agents.filter((a) => a.active !== false).map((a) => ({ value: String(a.id), label: a.name })),
                  ]}
                />
              )}
            />
          ) : null}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={pending} className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button type="submit" disabled={pending} className="inline-flex h-9 items-center gap-2 rounded-md bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-dark)] disabled:opacity-60">
            {pending ? <><Spinner />Saving…</> : client ? "Save" : "Add client"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------- Import modal ----------

type Mapping = { clientCode: number | null; name: number | null; phone: number | null; email: number | null; address: number | null; panCard: number | null };
type Preview = { importId: number; headers: string[]; mapping: Partial<Record<keyof Mapping, number | undefined>> };

const IMPORT_FIELDS: { key: keyof Mapping; label: string; required?: boolean }[] = [
  { key: "clientCode", label: "Client code", required: true },
  { key: "name", label: "Name", required: true },
  { key: "phone", label: "Phone", required: true },
  { key: "email", label: "Email", required: true },
  { key: "address", label: "Address" },
  { key: "panCard", label: "Pan card" },
];
const SKIP = "__skip__";
const MAX_SIZE = 5 * 1024 * 1024;
const EXTS = [".csv", ".txt", ".xlsx", ".xls"];

function colLetter(i: number) {
  let s = "";
  let n = i + 1;
  while (n > 0) {
    s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function ImportClientsModal({
  apiBase,
  onClose,
  onDone,
}: {
  apiBase: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [file, setFile] = useState<File | null>(null);
  const [hasHeader, setHasHeader] = useState(true);
  const [busy, setBusy] = useState<"" | "upload" | "confirm">("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [mapping, setMapping] = useState<Mapping>({ clientCode: null, name: null, phone: null, email: null, address: null, panCard: null });
  const [dragOver, setDragOver] = useState(false);

  function pickFile(f: File | undefined) {
    if (!f) return;
    const ext = EXTS.find((e) => f.name.toLowerCase().endsWith(e));
    if (!ext) return notify.error("Only .csv, .xlsx or .xls files are allowed");
    if (f.size > MAX_SIZE) return notify.error("File size must be 5 MB or less");
    setFile(f);
    setPreview(null);
    setStep(1);
  }

  async function readError(res: Response) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    return data.error ?? "Request failed";
  }

  async function upload() {
    if (!file) return;
    setBusy("upload");
    try {
      const qs = new URLSearchParams({ hasHeader: hasHeader ? "1" : "0", fileName: file.name });
      const res = await fetch(`${apiBase}/import-file?${qs}`, {
        method: "POST",
        headers: { "content-type": "application/octet-stream" },
        body: await file.arrayBuffer(),
      });
      if (!res.ok) {
        notify.error(await readError(res));
        return;
      }
      const data = (await res.json()) as Preview;
      setPreview(data);
      setMapping({
        clientCode: data.mapping?.clientCode ?? null,
        name: data.mapping?.name ?? null,
        phone: data.mapping?.phone ?? null,
        email: data.mapping?.email ?? null,
        address: data.mapping?.address ?? null,
        panCard: data.mapping?.panCard ?? null,
      });
      setStep(2);
    } catch {
      notify.error("Upload failed. Please try again.");
    } finally {
      setBusy("");
    }
  }

  async function confirm() {
    if (!preview) return;
    for (const f of IMPORT_FIELDS.filter((x) => x.required)) {
      if (mapping[f.key] == null) return notify.error(`Map the ${f.label} column`);
    }
    setBusy("confirm");
    try {
      const body: Record<string, number> = {};
      for (const f of IMPORT_FIELDS) if (mapping[f.key] != null) body[f.key] = mapping[f.key]!;
      const res = await fetch(`${apiBase}/imports/${preview.importId}/confirm`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mapping: body }),
      });
      if (!res.ok) {
        notify.error(await readError(res));
        return;
      }
      const data = (await res.json()) as { imported?: number; updated?: number; failed?: number; total?: number };
      const parts = [`${data.imported ?? 0} imported`, `${data.updated ?? 0} updated`, `${data.failed ?? 0} failed`];
      notify.success(`Import done — ${parts.join(", ")}`);
      onDone();
      setTimeout(onClose, 800);
    } catch {
      notify.error("Confirm failed. Please try again.");
    } finally {
      setBusy("");
    }
  }

  const busyNow = busy !== "";
  const colUsedByOther = (idx: number, self: keyof Mapping) =>
    IMPORT_FIELDS.some((f) => f.key !== self && mapping[f.key] === idx);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="relative w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
        <span role="button" aria-label="Close" onClick={() => !busyNow && onClose()} className="absolute right-3 top-3 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          <X size={16} />
        </span>
        <div className="mb-4">
          <h3 className="text-base font-semibold text-slate-900">Import clients</h3>
          <p className="mt-0.5 text-xs text-slate-400">Step {step} of 2</p>
        </div>

        {step === 1 ? (
          <div className="flex flex-col gap-4">
            {!file ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files?.[0]); }}
                onClick={() => inputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
                  dragOver ? "border-[var(--primary)] bg-[var(--primary-soft)]" : "border-slate-300 bg-slate-50 hover:bg-slate-100"
                }`}
              >
                <FileSpreadsheet size={40} className="text-slate-400" />
                <div>
                  <p className="text-sm font-medium text-slate-700">Drag & drop your file here</p>
                  <p className="mt-1 text-xs text-slate-500">or click to browse — .csv, .xlsx, .xls (max 5 MB)</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                <FileSpreadsheet size={16} className="text-slate-400" />
                <span className="truncate font-medium">{file.name}</span>
                <span className="ml-auto text-xs text-slate-400">{(file.size / 1024).toFixed(0)} KB</span>
                <button type="button" onClick={() => { setFile(null); setPreview(null); if (inputRef.current) inputRef.current.value = ""; }} className="inline-flex h-7 items-center rounded-md border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50">
                  Change
                </button>
              </div>
            )}

            <label className="flex cursor-pointer flex-col items-start gap-0.5 text-sm text-slate-600">
              <span className="flex items-center gap-2">
                <input type="checkbox" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
                First row contains column headers
              </span>
              <span className="pl-6 text-xs text-slate-400">Uncheck if your file has no header row</span>
            </label>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} disabled={busyNow} className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button type="button" onClick={upload} disabled={busyNow || !file} className="inline-flex h-9 items-center gap-2 rounded-md bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-dark)] disabled:opacity-60">
                {busy === "upload" ? <><Spinner />Uploading…</> : "Next"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <FileSpreadsheet size={16} className="text-slate-400" />
              <span className="truncate font-medium">{file?.name}</span>
              <span className="ml-auto text-xs text-slate-400">{preview?.headers.length ?? 0} columns</span>
              <button type="button" onClick={() => { setStep(1); setPreview(null); }} disabled={busyNow} className="inline-flex h-7 items-center rounded-md border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50">
                Change
              </button>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Map your columns</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {IMPORT_FIELDS.map((f) => (
                  <AppSelect
                    key={f.key}
                    label={f.label + (f.required ? " *" : "")}
                    value={mapping[f.key] != null ? String(mapping[f.key]) : SKIP}
                    onChange={(v) => v && setMapping((m) => ({ ...m, [f.key]: v === SKIP ? null : Number(v) }))}
                    data={[
                      { value: SKIP, label: "— skip —" },
                      ...(preview?.headers ?? []).map((h, i) => ({
                        value: String(i),
                        label: hasHeader && h.trim() ? h : `Column ${colLetter(i)}`,
                        disabled: colUsedByOther(i, f.key),
                      })),
                    ]}
                  />
                ))}
              </div>
              <p className="mt-1.5 text-xs text-slate-400">We guessed the mapping — adjust if needed. Client code, Name, Phone and Email are required.</p>
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setStep(1)} disabled={busyNow} className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Back
              </button>
              <button type="button" onClick={confirm} disabled={busyNow} className="inline-flex h-9 items-center gap-2 rounded-md bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-dark)] disabled:opacity-60">
                {busy === "confirm" ? <><Spinner />Importing…</> : "Import clients"}
              </button>
            </div>
          </div>
        )}

        <input ref={inputRef} type="file" accept=".csv,.txt,.xlsx,.xls" className="hidden" onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ""; }} />
      </div>
    </div>
  );
}

// ---------- Main browser ----------

export function ClientsBrowser({ portal, actions }: { portal: "company" | "agent"; actions: ClientActions }) {
  const isAdmin = portal === "company";
  const apiBase = isAdmin ? "/api/crm/clients" : "/api/agent/clients";

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(PER_PAGE);
  const [agentFilter, setAgentFilter] = useState(ALL);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ClientRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClientRow | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiBase);
      if (!res.ok) throw new Error("Failed to load clients");
      const data = await res.json();
      setClients(data.clients ?? []);
      if (data.agents) setAgents(data.agents);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load clients");
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return clients.filter((c) => {
      if (agentFilter !== ALL) {
        if (agentFilter === "none" ? c.agentId != null : c.agentId !== Number(agentFilter)) return false;
      }
      if (!query) return true;
      return [c.clientCode, c.name, c.phone, c.email, c.address, c.panCard, c.agentName]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(query));
    });
  }, [clients, q, agentFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * perPage, safePage * perPage);

  function openAdd() {
    setEditTarget(null);
    setFormOpen(true);
  }

  function openEdit(c: ClientRow) {
    setEditTarget(c);
    setFormOpen(true);
  }

  async function saveClient(data: ClientFormValues): Promise<ClientActionResult> {
    const payload: Record<string, unknown> = {
      clientCode: data.clientCode.trim().toUpperCase(),
      name: data.name.trim(),
      phone: data.phone.trim(),
      email: data.email.trim(),
      address: data.address?.trim() || null,
      panCard: data.panCard?.trim().toUpperCase() || null,
    };
    if (isAdmin) payload.agentId = data.agentId ?? null;
    const res = editTarget ? await actions.updateClient(editTarget.id, payload) : await actions.createClient(payload);
    if (res.error) {
      notify.error(res.error);
      return res;
    }
    notify.success(editTarget ? `${data.name} updated` : `${data.name} added`);
    await load();
    return res;
  }

  const exportQs = isAdmin && agentFilter !== ALL ? `?agent=${agentFilter}` : "";

  const columns = useMemo<DataTableColumn<ClientRow>[]>(() => {
    const cols: DataTableColumn<ClientRow>[] = [
      {
        header: "Client code",
        className: "w-[120px] max-w-[120px] whitespace-nowrap",
        cell: (c) => <span className="block truncate font-medium uppercase text-slate-800">{c.clientCode}</span>,
      },
      {
        header: "Name",
        className: "w-[180px] max-w-[180px]",
        cell: (c) => <ClampedText text={c.name?.replace(/\s+/g, " ")} display={c.name?.replace(/\s+/g, " ").toLowerCase()} capitalize lines={2} className="font-medium text-slate-700" />,
      },
      {
        header: "Phone",
        className: "w-[130px] max-w-[130px] whitespace-nowrap",
        cell: (c) => <span className="block truncate text-slate-600">{c.phone}</span>,
      },
      {
        header: "Email",
        className: "w-[240px] max-w-[240px] whitespace-nowrap",
        cell: (c) => <ClampedText text={c.email} lines={1} />,
      },
      {
        header: "Address",
        className: "w-[240px] max-w-[240px]",
        cell: (c) => <ClampedText text={c.address?.replace(/\s+/g, " ")} display={c.address?.replace(/\s+/g, " ").toLowerCase()} capitalize className="text-slate-500" />,
      },
      {
        header: "Pan card",
        className: "w-[120px] max-w-[120px] whitespace-nowrap",
        cell: (c) => <span className="block truncate uppercase text-slate-600">{c.panCard || "-"}</span>,
      },
    ];
    if (isAdmin) {
      cols.push({
        header: "Agent",
        className: "w-[140px] max-w-[140px]",
        cell: (c) => <ClampedText text={c.agentName} />,
      });
    }
    cols.push(
      {
        header: "Created",
        className: "w-[110px] whitespace-nowrap",
        cell: (c) => <span className="whitespace-nowrap text-xs text-slate-500">{fmtDate(c.createdAt)}</span>,
      },
      {
        header: "",
        className: "w-[72px] text-right",
        cell: (c) => (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              title="Edit"
              onClick={() => openEdit(c)}
              aria-label="Edit client"
              className="inline-flex items-center justify-center rounded-md bg-slate-200 p-2.5 text-slate-700 transition-colors hover:bg-slate-300"
            >
              <Pencil size={12} strokeWidth={2.2} color="#334155" />
            </button>
            <button
              type="button"
              title="Delete"
              onClick={() => setDeleteTarget(c)}
              aria-label="Delete client"
              className="inline-flex items-center justify-center rounded-md bg-red-50 p-2.5 text-red-500 transition-colors hover:bg-red-100"
            >
              <Trash2 size={12} strokeWidth={2.2} />
            </button>
          </div>
        ),
      },
    );
    return cols;
  }, [isAdmin]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{isAdmin ? "Clients" : "My clients"}</h1>
        <p className="mt-0.5 text-sm text-slate-500">{isAdmin ? "All clients across agents" : "Your client directory"}</p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search clients…" className="w-full sm:max-w-xs" />
        {isAdmin ? (
          <AppSelect
            value={agentFilter}
            onChange={(v) => { setAgentFilter(v ?? ALL); setPage(1); }}
            data={[
              { value: ALL, label: "All agents" },
              ...agents.map((a) => ({ value: String(a.id), label: a.name })),
              { value: "none", label: "My clients (-)" },
            ]}
            className="sm:w-52"
          />
        ) : null}
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Upload size={14} /> Import
          </button>
          <a
            href={`${apiBase}/export.csv${exportQs}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Download size={14} /> Export CSV
          </a>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[var(--primary)] px-3 text-sm font-medium text-white hover:bg-[var(--primary-dark)]"
          >
            <Plus size={14} /> Add client
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400"><Spinner /> Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
          <Users size={28} className="text-slate-300" />
          <p className="text-sm font-medium text-slate-600">{q || agentFilter !== ALL ? "No clients match your filters" : "No clients yet"}</p>
          <p className="text-xs text-slate-400">{q || agentFilter !== ALL ? "Try a different search or filter." : "Add a client or import a CSV file to get started."}</p>
        </div>
      ) : (
        <>
          <DataTable columns={columns} rows={paged} rowKey={(c) => c.id} />
          {filtered.length >= PER_PAGE && (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <Pagination page={safePage} pages={totalPages} total={filtered.length} perPage={perPage} onPage={setPage} onPerPageChange={(n) => { setPerPage(n); setPage(1); }} />
            </div>
          )}
        </>
      )}

      {formOpen ? (
        <ClientFormModal
          client={editTarget}
          agents={agents}
          showAgent={isAdmin}
          onClose={() => setFormOpen(false)}
          onSave={saveClient}
        />
      ) : null}

      {importOpen ? (
        <ImportClientsModal
          apiBase={apiBase}
          onClose={() => setImportOpen(false)}
          onDone={load}
        />
      ) : null}

      <ConfirmDialog
        open={deleteTarget != null}
        onClose={() => setDeleteTarget(null)}
        title="Delete client?"
        message={deleteTarget ? `${deleteTarget.name} (${deleteTarget.clientCode}) will be removed from the client list.` : undefined}
        confirmLabel="Delete"
        danger
        pending={pending}
        onConfirm={() => {
          if (!deleteTarget) return;
          startTransition(async () => {
            const res = await actions.deleteClient(deleteTarget.id);
            if (res.error) notify.error(res.error);
            else {
              notify.success("Client deleted");
              setDeleteTarget(null);
              await load();
            }
          });
        }}
      />
    </div>
  );
}
