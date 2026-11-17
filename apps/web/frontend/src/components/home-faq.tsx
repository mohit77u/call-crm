"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "Do agents need to do anything for calls to sync?",
    a: "No. Once the Call CRM app is installed on an agent's phone with the company client code, calls are logged automatically. The agent only needs to keep the app installed and logged in.",
  },
  {
    q: "What is the difference between the Call logs and Agent CRM editions?",
    a: "Call logs gives your company a dashboard of every call made by your team. Agent CRM adds the agent portal on top — agents see their own leads, submit trial requests, and import leads, and the company admin can assign leads to agents.",
  },
  {
    q: "Can we change plans later?",
    a: "Yes. You can upgrade or downgrade between editions and tiers anytime — our team applies the change and adjusts billing accordingly.",
  },
  {
    q: "How do agents get access?",
    a: "Your company admin creates agent accounts from the Agents page and shares the login. Agents log in at the agent portal to see their leads and activity.",
  },
  {
    q: "Is there a contract or commitment?",
    a: "Plans are billed monthly or yearly with no long-term lock-in. Yearly billing gives you two months free.",
  },
  {
    q: "Can we import our existing leads?",
    a: "Yes — import leads from CSV/Excel from the Leads page, or use the import endpoint for bulk uploads. Imported leads can be assigned to agents.",
  },
];

export function HomeFaq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-3xl divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {faqs.map((f, i) => {
        const isOpen = open === i;
        return (
          <div key={f.q}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 bg-white px-5 py-4 text-left shadow-none transition-colors hover:bg-slate-50 sm:px-6"
            >
              <span className="text-sm font-semibold text-slate-800">{f.q}</span>
              <ChevronDown size={18} className={`shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>
            {isOpen && <p className="px-5 pb-5 text-sm leading-relaxed text-slate-500 sm:px-6">{f.a}</p>}
          </div>
        );
      })}
    </div>
  );
}
