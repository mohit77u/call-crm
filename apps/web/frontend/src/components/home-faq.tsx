"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    q: "Do agents need to do anything for calls to sync?",
    a: "No. Once the Android app is installed and logged in with the client code, call logs upload automatically — even in the background. Agents only need to grant call-log permission once during setup.",
  },
  {
    q: "What is the difference between the Call logs and Agent CRM editions?",
    a: "Call logs gives your company dashboard, agent management and call analytics. Agent CRM adds a full web portal for agents — they can request leads, track assignments, update follow-ups and manage free trials from their own login.",
  },
  {
    q: "Can we change plans later?",
    a: "Yes. Upgrade or downgrade anytime — features and agent limits adjust immediately. Our team handles the plan change on your workspace; there is no downtime.",
  },
  {
    q: "How do agents get access?",
    a: "You create agent usernames from the company dashboard (or agents self-register where enabled). They install the Android app for call sync, and CRM-edition agents additionally get a web login for the agent portal.",
  },
  {
    q: "Is there a contract or commitment?",
    a: "No long-term contract. Plans are billed monthly or annually (annual billing gets 2 months free). Cancel or change anytime by contacting us.",
  },
  {
    q: "Can we import our existing leads?",
    a: "Yes — CRM edition supports bulk CSV import with column mapping, background processing, error reports and bulk actions like assign / delete.",
  },
];

export function HomeFaq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-3">
      {FAQS.map((f, i) => {
        const isOpen = open === i;
        return (
          <div key={f.q} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              aria-expanded={isOpen}
            >
              <span className="text-sm font-semibold text-slate-800">{f.q}</span>
              <ChevronDown size={18} className={`shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>
            {isOpen && <p className="px-5 pb-5 text-sm leading-relaxed text-slate-500">{f.a}</p>}
          </div>
        );
      })}
    </div>
  );
}
