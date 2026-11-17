"use client";

import { useState } from "react";
import { PhoneCall, Users, Check } from "lucide-react";

const PANELS = {
  calls: {
    icon: PhoneCall,
    title: "Call tracking, on autopilot",
    desc: "The Android app uploads call logs automatically — in the foreground and background — so every call lands in the dashboard without agents lifting a finger.",
    points: [
      "Every incoming & outgoing call with exact talk time",
      "Connected / missed / received status per call",
      "Dual-SIM support — sync only the work SIM",
      "Agent-wise stats, filters and CSV exports",
      "Optional last-known location on each check-in",
    ],
    stats: [
      ["Auto-sync", "Every few minutes"],
      ["Status", "Connected / Missed / Received"],
      ["Export", "CSV in one click"],
    ],
  },
  crm: {
    icon: Users,
    title: "A full CRM inside your agents' pockets",
    desc: "Agents log in on the web, request leads, update statuses and track follow-ups — while admins assign, import and monitor everything from one place.",
    points: [
      "Agent portal with own login — dashboard, leads, trials",
      "Lead requests with admin approve / reject flow",
      "Bulk lead import from CSV with error reports",
      "Assign leads to agents — selected or random",
      "Free trial tracking with day counters",
      "Notifications for requests, imports and updates",
    ],
    stats: [
      ["Roles", "Admin + Agent portals"],
      ["Import", "Bulk CSV upload"],
      ["Trials", "Day-wise tracking"],
    ],
  },
} as const;

type Tab = keyof typeof PANELS;

export function HomeShowcase() {
  const [tab, setTab] = useState<Tab>("calls");
  const panel = PANELS[tab];
  const Icon = panel.icon;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex justify-center border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="inline-flex w-full max-w-md rounded-xl border border-slate-200 bg-slate-100 p-1 sm:w-auto">
          {(Object.keys(PANELS) as Tab[]).map((key) => {
            const P = PANELS[key];
            const active = tab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all sm:flex-none ${
                  active ? "bg-white text-[var(--primary)] shadow-sm" : "bg-transparent text-slate-500 hover:bg-slate-200/60 hover:text-slate-700"
                }`}
              >
                <P.icon size={15} />
                {key === "calls" ? "Call logs" : "Agent CRM"}
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid gap-8 p-6 sm:grid-cols-[1.2fr_1fr] sm:p-8">
        <div>
          <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <Icon size={22} />
          </div>
          <h3 className="text-xl font-bold text-slate-900">{panel.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">{panel.desc}</p>
          <ul className="mt-5 flex flex-col gap-2.5">
            {panel.points.map((pt) => (
              <li key={pt} className="flex items-start gap-2.5 text-sm text-slate-600">
                <Check size={16} className="mt-0.5 shrink-0 text-emerald-600" strokeWidth={3} />
                {pt}
              </li>
            ))}
          </ul>
        </div>
        <div className="grid grid-cols-1 content-start gap-3">
          {panel.stats.map(([k, v]) => (
            <div key={k} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{k}</div>
              <div className="mt-1 text-sm font-semibold text-slate-800">{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
