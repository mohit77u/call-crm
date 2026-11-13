"use client";

import { useRef, useState, useTransition } from "react";
import { FileSpreadsheet, X } from "lucide-react";
import { Spinner } from "@/components/spinner";
import { AppSelect } from "@/components/app-select";
import { notify } from "@/lib/notify";
import { importLeads } from "./actions";

type AgentOption = { id: number; name: string };
type Mapping = { name?: number; phone?: number; email?: number; notes?: number };

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const EXTS = [".csv", ".txt", ".xlsx", ".xls"];

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

async function parseFile(file: File): Promise<string[][]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || name.endsWith(".txt")) {
    return parseCsv(await file.text());
  }
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: "" }) as string[][];
}

function guessMapping(headers: string[]): Mapping {
  const find = (keys: string[]) => headers.findIndex((h) => keys.some((k) => h.toLowerCase().includes(k)));
  const nameIdx = find(["name", "customer", "lead", "contact person"]);
  return {
    name: nameIdx >= 0 ? nameIdx : 0,
    phone: find(["phone", "mobile", "contact", "number", "tel"]),
    email: find(["email", "mail"]),
    notes: find(["note", "remark", "comment", "description"]),
  };
}

const FIELDS: { key: keyof Mapping; label: string }[] = [
  { key: "phone", label: "Phone *" },
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
];

const SKIP = "__skip";

export function ImportLeadsModal({ agents, onClose, onDone }: { agents: AgentOption[]; onClose: () => void; onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [pending, startTransition] = useTransition();
  const [parsing, setParsing] = useState(false);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Mapping>({});
  const [assignMode, setAssignMode] = useState<"none" | "agent" | "random">("none");
  const [assignAgent, setAssignAgent] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [doneMsg, setDoneMsg] = useState("");

  async function handleFile(file: File) {
    const ext = EXTS.find((e) => file.name.toLowerCase().endsWith(e));
    if (!ext) return notify.error("Only .csv, .xlsx or .xls files are allowed");
    if (file.size > MAX_SIZE) return notify.error("File size must be 5 MB or less");
    setParsing(true);
    try {
      const all = await parseFile(file);
      if (all.length < 2 || !all.slice(1).some((r) => r.some((c) => String(c ?? "").trim() !== ""))) {
        notify.error("File must have a header row and at least one data row");
        return;
      }
      const head = all[0].map((h) => String(h ?? "").trim());
      setFileName(file.name);
      setHeaders(head);
      setRows(all.slice(1, 5001));
      setMapping(guessMapping(head));
      setStep(2);
    } catch {
      notify.error("Could not read file. Use .csv, .xlsx or .xls");
    } finally {
      setParsing(false);
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void handleFile(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  // Header index -> fields already using it (a header can be mapped only once)
  const usedBy = (idx: number | undefined, self: keyof Mapping) =>
    idx != null && FIELDS.some((f) => f.key !== self && mapping[f.key] === idx);

  function setField(key: keyof Mapping, value: string | null) {
    setMapping((m) => {
      const next = { ...m };
      if (!value || value === SKIP) delete next[key];
      else {
        const idx = Number(value);
        // free this header from any other field first
        (Object.keys(next) as (keyof Mapping)[]).forEach((k) => {
          if (k !== key && next[k] === idx) delete next[k];
        });
        next[key] = idx;
      }
      return next;
    });
  }

  function doImport() {
    if (mapping.phone == null || mapping.phone < 0) return notify.error("Map the Phone column");
    if (assignMode === "agent" && !assignAgent) return notify.error("Select an agent");
    setProcessing(true);
    startTransition(async () => {
      const res = await importLeads({
        rows: rows as unknown[][],
        mapping,
        assignment: { mode: assignMode, agentId: assignMode === "agent" ? Number(assignAgent) : null },
      });
      setProcessing(false);
      if (res.error) {
        notify.error(res.error);
        return; // stay on step 2
      }
      setDoneMsg(res.notice ?? "Import done");
      onDone();
      setTimeout(() => {
        onClose();
        setDoneMsg("");
      }, 1500);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => !pending && !parsing && !processing && onClose()}>
      <div className="relative w-full max-w-lg rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <span
          role="button"
          aria-label="Close"
          onClick={() => {
            if (!pending && !parsing && !processing) onClose();
          }}
          className="absolute right-3 top-3 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X size={16} />
        </span>
        <div className="mb-4">
          <h3 className="text-base font-semibold text-slate-900">Import leads</h3>
          <p className="mt-0.5 text-right text-xs font-medium text-slate-400">Step {step} of 2</p>
        </div>

        {step === 1 && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors ${
              dragOver ? "border-[var(--primary)] bg-indigo-50" : "border-slate-300 bg-slate-50 hover:bg-slate-100"
            }`}
          >
            <FileSpreadsheet size={40} className="text-slate-400" />
            <div>
              <p className="text-sm font-medium text-slate-700">{parsing ? "Reading file…" : "Drag & drop your file here"}</p>
              <p className="mt-1 text-xs text-slate-500">or click to browse — .csv, .xlsx, .xls (max 5 MB)</p>
            </div>
            {parsing && <Spinner />}
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <FileSpreadsheet size={16} className="text-slate-400" />
              <span className="truncate font-medium">{fileName}</span>
              <span className="ml-auto text-xs text-slate-400">{rows.length} rows</span>
              <button
                type="button"
                onClick={() => { setStep(1); setHeaders([]); setRows([]); setMapping({}); }}
                className="inline-flex h-7 items-center rounded-md border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Change
              </button>
            </div>

            {processing || doneMsg ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-6 py-10 text-center">
                {doneMsg ? (
                  <>
                    <p className="text-sm font-medium text-emerald-600">{doneMsg}</p>
                    <p className="text-xs text-slate-500">Refreshing leads…</p>
                  </>
                ) : (
                  <>
                    <Spinner />
                    <p className="text-sm font-medium text-slate-700">Processing import…</p>
                    <p className="text-xs text-slate-500">Please wait, this can take a moment for large files.</p>
                  </>
                )}
              </div>
            ) : (
              <>
                <div>
                  <p className="mb-2 text-sm font-medium text-slate-700">Map your columns</p>
                  <div className="flex flex-col gap-2">
                    {FIELDS.map((f) => (
                      <div key={f.key} className="flex items-center justify-between gap-3">
                        <span className="text-sm text-slate-600">{f.label}</span>
                        <AppSelect
                          className="w-44"
                          value={mapping[f.key] != null ? String(mapping[f.key]) : SKIP}
                          onChange={(v) => setField(f.key, v)}
                          data={[
                            { value: SKIP, label: "— skip —" },
                            ...headers.map((h, i) => ({
                              value: String(i),
                              label: `${h || `Column ${i + 1}`}${usedBy(i, f.key) ? " (used)" : ""}`,
                              disabled: usedBy(i, f.key),
                            })),
                          ]}
                        />
                      </div>
                    ))}
                  </div>
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
                  <button type="button" onClick={onClose} disabled={pending} className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={doImport}
                    disabled={pending}
                    className="inline-flex h-9 items-center gap-2 rounded-md bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-dark)] disabled:opacity-60"
                  >
                    {pending ? <><Spinner />Importing…</> : "Import leads"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        <input ref={fileRef} type="file" accept=".csv,.txt,.xlsx,.xls" className="hidden" onChange={onFile} />
      </div>
    </div>
  );
}
