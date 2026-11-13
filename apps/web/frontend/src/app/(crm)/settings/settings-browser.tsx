"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { regenerateClientCode, updateCompanyName } from "./actions";
import { notify } from "@/lib/notify";

const toolbarBtn =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50";
const primaryBtn =
  "inline-flex h-9 items-center justify-center rounded-md bg-[var(--primary)] px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[var(--primary-dark)] disabled:opacity-60";

export function SettingsBrowser({ companyName, clientCode, adminName, adminEmail }: { companyName: string; clientCode: string; adminName: string; adminEmail: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(companyName);

  const run = (fn: () => Promise<{ error?: string; notice?: string }>, done?: () => void) => {
    startTransition(async () => {
      const res = await fn();
      if (res.error) notify.error(res.error);
      else {
        notify.success(res.notice ?? "Done");
        done?.();
        router.refresh();
      }
    });
  };

  return (
    <>
      <div className="card">
        <h2>Client Code</h2>
        <p className="muted">Every agent enters this code in the Android app, then logs in with their own username and password.</p>
        <div className="code">{clientCode}</div>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            className={toolbarBtn}
            disabled={pending}
            onClick={() => run(regenerateClientCode)}
          >
            {pending ? "Working…" : "Generate New Code"}
          </button>
          <span className="text-[13px] text-slate-500">Phones already logged in stay connected.</span>
        </div>
      </div>
      <div className="card">
        <h2>Company</h2>
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData();
            fd.set("name", name);
            run(() => updateCompanyName(fd));
          }}
        >
          <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-slate-500">
            Company Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-[var(--primary)] focus:outline-none"
            />
          </label>
          <button type="submit" className={primaryBtn} disabled={pending || !name.trim()}>
            {pending ? "Saving…" : "Save"}
          </button>
        </form>
        <p className="muted mt-3">Admin: {adminName} ({adminEmail})</p>
      </div>
    </>
  );
}
