"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, X } from "lucide-react";
import { Spinner } from "@/components/spinner";
import { AppSelect } from "@/components/app-select";
import { notify } from "@/lib/notify";

type AgentOption = { id: number; name: string };
type Mapping = { name: number | null; phone: number | null; email: number | null; notes: number | null };
type Preview = { importId: number; headers: string[]; mapping: Partial<Record<keyof Mapping, number | undefined>> };

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const EXTS = [".csv", ".txt", ".xlsx", ".xls"];
const FIELDS: { key: keyof Mapping; label: string; required?: boolean }[] = [
  { key: "phone", label: "Phone", required: true },
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "notes", label: "Notes" },
];
const SKIP = "__skip__";

function colLetter(i: number) {
  let s = "";
  let n = i + 1;
  while (n > 0) {
    s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function ImportLeadsModal({ agents, onClose, onDone }: { agents: AgentOption[]; onClose: () => void; onDone: () => void }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [file, setFile] = useState<File | null>(null);
  const [hasHeader, setHasHeader] = useState(true);
  const [assignMode, setAssignMode] = useState<"none" | "agent" | "random">("none");
  const [assignAgent, setAssignAgent] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState<"" | "upload" | "confirm">("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [mapping, setMapping] = useState<Mapping>({ name: null, phone: null, email: null, notes: null });

  function pickFile(f: File | undefined) {
    if (!f) return;
    const ext = EXTS.find((e) => f.name.toLowerCase().endsWith(e));
    if (!ext) return notify.error("Only .csv, .xlsx or .xls files are allowed");
    if (f.size > MAX_SIZE) return notify.error("File size must be 5 MB or less");
    setFile(f);
    setPreview(null);
    setStep(1);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    pickFile(e.target.files?.[0]);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    pickFile(e.dataTransfer.files?.[0]);
  }

  const colUsedByOther = (idx: number, self: keyof Mapping) =>
    FIELDS.some((f) => f.key !== self && mapping[f.key] === idx);

  function setField(key: keyof Mapping, v: string) {
    setMapping((m) => ({ ...m, [key]: v === SKIP ? null : Number(v) }));
  }

  async function readError(res: Response) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    return data.error ?? "Request failed";
  }

  async function upload() {
    if (!file) return;
    setBusy("upload");
    try {
      const qs = new URLSearchParams({
        hasHeader: hasHeader ? "1" : "0",
        fileName: file.name,
      });
      const res = await fetch(`/api/crm/leads/import-file?${qs}`, {
        method: "POST",
        headers: { "content-type": "application/octet-stream" },
        body: await file.arrayBuffer(),
      });
      if (!res.ok) {
        notify.error(await readError(res));
        return;
      }
      const data = (await res.json()) as Preview & { error?: string };
      setPreview(data);
      setMapping({
        name: data.mapping?.name ?? null,
        phone: data.mapping?.phone ?? null,
        email: data.mapping?.email ?? null,
        notes: data.mapping?.notes ?? null,
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
    if (mapping.phone == null) return notify.error("Map the Phone column");
    if (assignMode === "agent" && !assignAgent) return notify.error("Select an agent");
    setBusy("confirm");
    try {
      const body: Record<string, number> = {};
      for (const f of FIELDS) if (mapping[f.key] != null) body[f.key] = mapping[f.key]!;
      const res = await fetch(`/api/crm/leads/imports/${preview.importId}/confirm`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mapping: body,
          assign: { mode: assignMode === "agent" ? "agent" : assignMode, agentId: assignAgent ? Number(assignAgent) : null },
        }),
      });
      if (!res.ok) {
        notify.error(await readError(res));
        return;
      }
      const data = (await res.json()) as { status?: string; imported?: number; skipped?: number };
      const queued = data.status === "processing";
      const msg = queued
        ? "Import job queued — track progress in Imported files"
        : `Imported ${data.imported ?? 0} lead${data.imported === 1 ? "" : "s"} (${data.skipped ?? 0} skipped)`;
      notify.success(msg);
      onDone();
      setTimeout(() => {
        onClose();
        if (queued) router.push("/company/imported-files");
      }, 800);
    } catch {
      notify.error("Confirm failed. Please try again.");
    } finally {
      setBusy("");
    }
  }

  const busyNow = busy !== "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="relative w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
        <span
          role="button"
          aria-label="Close"
          onClick={() => {
            if (!busyNow) onClose();
          }}
          className="absolute right-3 top-3 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X size={16} />
        </span>
        <div className="mb-4">
          <h3 className="text-base font-semibold text-slate-900">Import leads</h3>
          <p className="mt-0.5 text-xs text-slate-400">Step {step} of 2</p>
        </div>

        {step === 1 ? (
          <div className="flex flex-col gap-4">
            {!file ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
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
                <button
                  type="button"
                  onClick={() => { setFile(null); setPreview(null); if (fileRef.current) fileRef.current.value = ""; }}
                  className="inline-flex h-7 items-center rounded-md border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  Change
                </button>
              </div>
            )}

            <div>
              <label className="flex cursor-pointer flex-col items-start gap-0.5 text-sm text-slate-600">
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={hasHeader}
                    onChange={(e) => setHasHeader(e.target.checked)}
                    className="h-4 w-4 accent-[var(--primary)]"
                  />
                  First row contains column headers
                </span>
                <span className="pl-6 text-xs text-slate-400">Uncheck if your file has no header row</span>
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} disabled={busyNow} className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button
                type="button"
                onClick={upload}
                disabled={busyNow || !file}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-dark)] disabled:opacity-60"
              >
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
              <button
                type="button"
                onClick={() => { setStep(1); setPreview(null); }}
                disabled={busyNow}
                className="inline-flex h-7 items-center rounded-md border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Change
              </button>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Map your columns</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {FIELDS.map((f) => (
                  <AppSelect
                    key={f.key}
                    label={f.label + (f.required ? " *" : "")}
                    value={mapping[f.key] != null ? String(mapping[f.key]) : SKIP}
                    onChange={(v) => v && setField(f.key, v)}
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
              <p className="mt-1.5 text-xs text-slate-400">We guessed the mapping — adjust if needed. Phone is required.</p>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Assign imported leads to</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <AppSelect
                  value={assignMode}
                  onChange={(v) => v && setAssignMode(v as typeof assignMode)}
                  data={[
                    { value: "none", label: "Unassigned" },
                    { value: "agent", label: "Specific agent" },
                    { value: "random", label: "Random agents" },
                  ]}
                />
                {assignMode === "agent" ? (
                  <AppSelect
                    value={assignAgent || null}
                    onChange={(v) => setAssignAgent(v ?? "")}
                    placeholder="Select agent"
                    data={agents.map((a) => ({ value: String(a.id), label: a.name }))}
                  />
                ) : (
                  <div className="hidden sm:block" />
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setStep(1)} disabled={busyNow} className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Back
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={busyNow || mapping.phone == null}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-dark)] disabled:opacity-60"
              >
                {busy === "confirm" ? <><Spinner />Starting…</> : "Import leads"}
              </button>
            </div>
          </div>
        )}

        <input ref={fileRef} type="file" accept=".csv,.txt,.xlsx,.xls" className="hidden" onChange={onFile} />
      </div>
    </div>
  );
}
