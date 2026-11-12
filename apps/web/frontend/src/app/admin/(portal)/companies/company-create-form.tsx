"use client";

import { useState } from "react";
import { createCompany } from "./actions";
import { PlanFields, stateFromPlan, type PlanFormState } from "./plan-fields";

export function CompanyCreateForm({ error, notice }: { error?: string; notice?: string }) {
  const [planState, setPlanState] = useState<PlanFormState>(() => stateFromPlan("basic"));

  return (
    <form action={createCompany} className="card form">
      {error && <div className="error">{error}</div>}
      {notice && <div className="notice">{notice}</div>}
      <h2>Company</h2>
      <label>Company name<input name="name" required autoFocus /></label>
      <h2>Company admin</h2>
      <p className="muted">This person logs in to the CRM. Share the client code and these credentials with them.</p>
      <label>Admin name<input name="adminName" required /></label>
      <label>Admin email<input name="adminEmail" type="email" required /></label>
      <label>Admin password (min 8 characters)<input name="adminPassword" type="password" minLength={8} required /></label>
      <h2>Plan &amp; features</h2>
      <p className="muted">Pick a plan to auto-fill features and agent limits — you can still tweak them below.</p>
      <PlanFields state={planState} setState={setPlanState} />
      <div>
        <button type="submit">Create company</button>{" "}
        <a className="btn secondary" href="/admin">Cancel</a>
      </div>
    </form>
  );
}
