"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Sparkles, PhoneCall, Users, ArrowRight } from "lucide-react";
import { plansForEdition, inr, type PlanDef, type PlanEdition } from "@/lib/plans";
import { FEATURE_DEFS, LIMIT_DEFS, type FeatureKey, type LimitKey } from "@/lib/features";
import { setNavState } from "@/lib/nav-state";

function CheckIcon({ ok }: { ok: boolean }) {
  return ok ? <Check size={15} className="inline text-emerald-600" strokeWidth={3} /> : <span className="text-slate-300">—</span>;
}

function PlanCard({ plan, yearly }: { plan: PlanDef; yearly: boolean }) {
  const router = useRouter();
  const featured = plan.tier === "pro";
  const price = yearly ? plan.priceYearly : plan.priceMonthly;
  const perMonth = yearly ? Math.round(plan.priceYearly / 12) : plan.priceMonthly;
  return (
    <div
      className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-lg sm:p-7 ${
        featured ? "border-[var(--primary)] shadow-[0_12px_32px_rgba(79,70,229,0.15)]" : "border-slate-200"
      }`}
    >
      {featured && (
        <div className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-[var(--primary)] px-3.5 py-1 text-[11.5px] font-bold text-white shadow">
          <Sparkles size={11} /> Most popular
        </div>
      )}
      <div className="text-sm font-semibold text-slate-500">{plan.name.replace(" + CRM", "")}</div>
      <div className="mt-1 text-xs text-slate-400">{plan.tagline}</div>
      <div className="mt-4 flex items-end gap-1.5">
        <span className="text-4xl font-extrabold tracking-tight text-slate-900 max-[480px]:text-3xl">{inr(price)}</span>
        <span className="pb-1 text-sm text-slate-400">/{yearly ? "year" : "month"}</span>
      </div>
      {yearly && <div className="mt-1 text-xs text-slate-400">{inr(perMonth)}/mo billed annually · 2 months free</div>}
      <div className="mt-3 text-sm text-slate-500">
        <b className="text-slate-800">{plan.maxAgents}</b> agents included
      </div>
      <ul className="mt-5 flex flex-1 flex-col gap-2.5">
        {plan.highlights.map((h) => (
          <li key={h} className="flex items-start gap-2 text-[13.5px] text-slate-600">
            <Check size={15} className="mt-0.5 shrink-0 text-emerald-600" strokeWidth={3} />
            {h}
          </li>
        ))}
      </ul>
      <a
        className={`mt-6 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition-colors ${
          featured
            ? "bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)]"
            : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
        }`}
        href="/contact"
        onClick={(e) => {
          e.preventDefault();
          setNavState("crm:contact:plan", plan.slug);
          router.push("/contact");
        }}
      >
        Get {plan.name} <ArrowRight size={15} />
      </a>
    </div>
  );
}

function Toggle<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: React.ReactNode }[];
}) {
  return (
    <div className="inline-flex w-full max-w-md rounded-xl border border-slate-200 bg-slate-100 p-1 sm:w-auto">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-all sm:flex-none ${
            value === o.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function PricingClient() {
  const [yearly, setYearly] = useState(false);
  const [edition, setEdition] = useState<PlanEdition>("calls");
  const featureKeys = Object.keys(FEATURE_DEFS) as FeatureKey[];
  const limitKeys = Object.keys(LIMIT_DEFS) as LimitKey[];
  const plans = plansForEdition(edition);

  return (
    <div className="flex flex-col items-center gap-5">
      <Toggle
        value={edition}
        onChange={setEdition}
        options={[
          { value: "calls", label: "Call logs", icon: <PhoneCall size={15} /> },
          { value: "crm", label: "Call logs + Agent CRM", icon: <Users size={15} /> },
        ]}
      />
      <Toggle
        value={yearly ? "yearly" : "monthly"}
        onChange={(v) => setYearly(v === "yearly")}
        options={[
          { value: "monthly", label: "Monthly" },
          { value: "yearly", label: "Yearly", icon: <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">save ~17%</span> },
        ]}
      />

      <div className="grid w-full grid-cols-1 gap-5 pt-2 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((p) => <PlanCard key={p.slug} plan={p} yearly={yearly} />)}
      </div>
      <p className="text-center text-sm text-slate-500">
        Prices in INR, exclusive of GST. Need more than 50 agents or custom features? <Link href="/contact" className="font-medium text-[var(--primary)]">Contact us</Link>.
      </p>

      <div className="mt-6 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4 sm:px-7">
          <h2 className="text-lg font-bold text-slate-900">Compare plans</h2>
          <p className="text-sm text-slate-500">{edition === "crm" ? "Call logs + Agent CRM edition" : "Call logs edition"} — shown for the selected plan tier.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3 sm:px-7">Feature</th>
                {plans.map((p) => <th key={p.slug} className="px-4 py-3 text-center">{p.name.replace(" + CRM", "")}</th>)}
              </tr>
            </thead>
            <tbody>
              {limitKeys.map((k) => (
                <tr key={k} className="border-b border-slate-100">
                  <td className="px-5 py-3 text-slate-600 sm:px-7">{LIMIT_DEFS[k].label}</td>
                  {plans.map((p) => <td key={p.slug} className="px-4 py-3 text-center text-slate-700">{p.features[k] ?? "Unlimited"}</td>)}
                </tr>
              ))}
              {featureKeys.map((k) => (
                <tr key={k} className="border-b border-slate-100 last:border-0">
                  <td className="px-5 py-3 text-slate-600 sm:px-7">
                    {FEATURE_DEFS[k].label}
                    <span className="block text-xs text-slate-400">{FEATURE_DEFS[k].description}</span>
                  </td>
                  {plans.map((p) => <td key={p.slug} className="px-4 py-3 text-center"><CheckIcon ok={p.features[k] === true} /></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 w-full rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 text-center sm:p-8">
        <h2 className="text-xl font-bold text-slate-900">How to get started</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-500">
          Accounts are created by our team — there is no public signup. Send us an enquiry with your
          plan choice and we will set up your company workspace, share the client code and admin
          login, and help your agents install the app.
        </p>
        <p className="mt-3 text-sm text-slate-500">
          Ready? <Link href="/contact" className="font-semibold text-[var(--primary)]">Contact us to get started</Link>. Already a customer? <Link href="/company/login" className="font-semibold text-[var(--primary)]">Log in here</Link>.
        </p>
      </div>
    </div>
  );
}
