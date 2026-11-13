"use client";

import { useState } from "react";
import { TextField, EmailField, PasswordField } from "@/components/fields";
import { PlanFields, stateFromPlan, type PlanFormState } from "../companies/plan-fields";

const btnPrimary =
  "inline-flex h-9 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60";
const btnSecondary =
  "inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50";

const sectionTitle = "text-[13px] font-semibold uppercase tracking-wider text-slate-500";
const card = "rounded-lg border border-slate-200 bg-white shadow-sm";

function CompanyNameField() {
  return <TextField name="name" label="Company name" placeholder="e.g. Acme Sales Pvt Ltd" maxLength={100} size="sm" />;
}
function AdminNameField() {
  return <TextField name="adminName" label="Admin name" placeholder="Full name" maxLength={100} size="sm" />;
}
function AdminEmailField() {
  return <EmailField name="adminEmail" label="Admin email" size="sm" />;
}
function AdminPasswordField() {
  return <PasswordField name="adminPassword" label="Admin password" placeholder="Min. 8 characters" maxLength={100} size="sm" />;
}

function Footer() {
  return (
    <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
      <button type="button" className={btnSecondary}>Cancel</button>
      <button type="button" className={btnPrimary}>Create company</button>
    </div>
  );
}

/* V1 — CRM classic: single card, two-pane body, footer action bar */
function Variant1() {
  const [planState, setPlanState] = useState<PlanFormState>(() => stateFromPlan("basic"));
  return (
    <div className={card}>
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-900">New company</h2>
        <p className="mt-0.5 text-[13px] text-slate-500">Create a workspace and its first admin in one go.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:border-b-0 lg:border-r">
          <div>
            <h3 className={sectionTitle}>Company</h3>
            <div className="mt-3"><CompanyNameField /></div>
          </div>
          <div>
            <h3 className={sectionTitle}>Plan &amp; features</h3>
            <div className="mt-3"><PlanFields state={planState} setState={setPlanState} /></div>
          </div>
        </div>
        <div className="flex flex-col gap-4 p-5">
          <div>
            <h3 className={sectionTitle}>Company admin</h3>
            <p className="mt-1 text-xs text-slate-500">This person logs in to the CRM. Share the client code and these credentials with them.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <AdminNameField />
            <AdminEmailField />
          </div>
          <AdminPasswordField />
        </div>
      </div>
      <Footer />
    </div>
  );
}

/* V2 — Stepper style: numbered steps, single column, fields in 2-col grid */
function Variant2() {
  const [planState, setPlanState] = useState<PlanFormState>(() => stateFromPlan("basic"));
  const steps = ["Company", "Admin", "Plan"];
  return (
    <div className={card}>
      <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-3">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">{i + 1}</span>
            <span className="text-sm font-medium text-slate-700">{s}</span>
            {i < steps.length - 1 && <span className="mx-2 h-px w-8 bg-slate-300" />}
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-6 p-5">
        <section>
          <h3 className={sectionTitle}>Company details</h3>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <CompanyNameField />
          </div>
        </section>
        <section className="border-t border-slate-100 pt-5">
          <h3 className={sectionTitle}>Admin account</h3>
          <p className="mt-1 text-xs text-slate-500">Login credentials for the company dashboard.</p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <AdminNameField />
            <AdminEmailField />
            <div className="sm:col-span-2"><AdminPasswordField /></div>
          </div>
        </section>
        <section className="border-t border-slate-100 pt-5">
          <h3 className={sectionTitle}>Plan &amp; features</h3>
          <div className="mt-3"><PlanFields state={planState} setState={setPlanState} /></div>
        </section>
      </div>
      <Footer />
    </div>
  );
}

/* V3 — Compact dashboard: narrow centered form, minimal chrome */
function Variant3() {
  const [planState, setPlanState] = useState<PlanFormState>(() => stateFromPlan("basic"));
  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className={card}>
        <div className="p-5">
          <h2 className="text-base font-semibold text-slate-900">New company</h2>
          <p className="mt-0.5 text-[13px] text-slate-500">Create a workspace and its first admin.</p>
        </div>
        <div className="border-t border-slate-200 px-5 py-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><CompanyNameField /></div>
            <AdminNameField />
            <AdminEmailField />
            <div className="sm:col-span-2"><AdminPasswordField /></div>
          </div>
        </div>
        <div className="border-t border-slate-200 px-5 py-4">
          <PlanFields state={planState} setState={setPlanState} />
        </div>
        <Footer />
      </div>
    </div>
  );
}

export default function DesignPreviewPage() {
  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-xl font-bold text-slate-900">New company — layout samples</h1>
        <p className="mt-1 text-sm text-slate-500">CRM-style variants. Fields are live (Mantine, size sm), buttons are mock.</p>
      </div>
      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Variant 1 — Two-pane card (Salesforce/HubSpot style)</h2>
        <Variant1 />
      </section>
      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Variant 2 — Stepper sections (guided flow)</h2>
        <Variant2 />
      </section>
      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Variant 3 — Compact single card</h2>
        <Variant3 />
      </section>
    </div>
  );
}
