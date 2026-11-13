"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { updateCompanyAdmins } from "./actions";
import { notify } from "@/lib/notify";
import { Spinner } from "@/components/spinner";

const MAX_ADMINS = 3;

type ExistingAdmin = { id: number; name: string; email: string };
type Row = { key: string; id?: number; name: string; email: string; password: string; remove?: boolean };

let rowSeq = 0;
const newRow = (): Row => ({ key: `new-${++rowSeq}`, name: "", email: "", password: "" });

export function CompanyAdminsForm({ companyId, admins }: { companyId: number; admins: ExistingAdmin[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState<Row[]>(() => [
    ...admins.map((a) => ({ key: `a-${a.id}`, id: a.id, name: a.name, email: a.email, password: "" })),
  ]);
  const [removeIds, setRemoveIds] = useState<number[]>([]);

  const activeCount = rows.filter((r) => !r.remove).length + rows.filter((r) => r.id == null && !r.remove).length;
  const totalAfter = rows.filter((r) => r.id == null || !r.remove).length - removeIds.length + rows.filter((r) => r.id == null).length;
  void activeCount;
  void totalAfter;

  function patch(key: string, p: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
  }

  function toggleRemove(row: Row) {
    if (row.id != null) {
      setRows((rs) => rs.map((r) => (r.key === row.key ? { ...r, remove: !r.remove } : r)));
      setRemoveIds((ids) => (ids.includes(row.id!) ? ids.filter((x) => x !== row.id) : [...ids, row.id!]));
    } else {
      setRows((rs) => rs.filter((r) => r.key !== row.key));
    }
  }

  function addRow() {
    const kept = rows.filter((r) => !(r.id == null)).length + rows.filter((r) => r.id == null && !r.remove).length;
    const existingKept = admins.filter((a) => !removeIds.includes(a.id)).length;
    if (existingKept + rows.filter((r) => r.id == null).length >= MAX_ADMINS) return;
    void kept;
    setRows((rs) => [...rs, newRow()]);
  }

  const canAdd =
    admins.filter((a) => !removeIds.includes(a.id)).length + rows.filter((r) => r.id == null).length < MAX_ADMINS;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const upserts = rows
      .filter((r) => !(r.id != null && r.remove))
      .map((r) => ({
        id: r.id,
        name: r.name.trim(),
        email: r.email.trim().toLowerCase(),
        ...(r.id == null || r.password ? { password: r.password } : {}),
      }));
    const finalCount = admins.filter((a) => !removeIds.includes(a.id)).length + rows.filter((r) => r.id == null).length;
    if (finalCount < 1) return notify.error("At least one admin must remain");
    if (finalCount > MAX_ADMINS) return notify.error(`Maximum ${MAX_ADMINS} admins allowed`);
    if (upserts.some((u) => !u.name || !u.email)) return notify.error("Name and email are required for every admin");
    if (rows.some((r) => r.id == null && (!r.password || r.password.length < 8))) {
      return notify.error("New admins need a password of at least 8 characters");
    }
    startTransition(async () => {
      const res = await updateCompanyAdmins(companyId, { upserts, removeIds });
      if (res.error) notify.error(res.error);
      else {
        notify.success(res.notice ?? "Admins updated");
        setRemoveIds([]);
        router.refresh();
      }
    });
  }

  return (
    <form className="card form" onSubmit={onSubmit}>
      <div className="flex items-center justify-between">
        <h2 className="mb-0!">Manage admins</h2>
        <button
          type="button"
          onClick={addRow}
          disabled={!canAdd || pending}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          <Plus size={14} /> Add admin
        </button>
      </div>
      <p className="muted">Up to {MAX_ADMINS} admins per company. Leave password blank to keep the current one.</p>
      <div className="flex flex-col gap-3">
        {rows.map((r) => (
          <div
            key={r.key}
            className={`grid grid-cols-1 gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_1fr_auto] ${r.remove ? "border-red-200 bg-red-50/50 opacity-60" : "border-slate-200"}`}
          >
            <input
              value={r.name}
              onChange={(e) => patch(r.key, { name: e.target.value })}
              placeholder="Name"
              disabled={r.remove}
              required
            />
            <input
              type="email"
              value={r.email}
              onChange={(e) => patch(r.key, { email: e.target.value })}
              placeholder="Email"
              disabled={r.remove}
              required
            />
            <input
              type="password"
              value={r.password}
              onChange={(e) => patch(r.key, { password: e.target.value })}
              placeholder={r.id != null ? "New password (optional)" : "Password (min 8)"}
              disabled={r.remove}
              minLength={r.id == null ? 8 : undefined}
            />
            <button
              type="button"
              onClick={() => toggleRemove(r)}
              disabled={pending}
              className="inline-flex h-9 w-9 items-center justify-center self-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
              aria-label={r.remove ? "Undo remove" : "Remove admin"}
            >
              <Trash2 size={16} />
            </button>
            {r.remove && <span className="text-xs text-red-500 sm:col-span-4">Will be removed on save</span>}
          </div>
        ))}
      </div>
      <div>
        <button type="submit" disabled={pending}>
          {pending ? <span className="inline-flex items-center justify-center gap-2"><Spinner />Saving…</span> : "Save admins"}
        </button>
      </div>
    </form>
  );
}
