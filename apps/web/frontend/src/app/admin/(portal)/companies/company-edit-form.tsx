"use client";

import { useState } from "react";
import { updateCompany } from "./actions";
import { PlanFields, type PlanFormState } from "./plan-fields";
import { FEATURE_DEFS, type FeatureKey } from "@/lib/features";

export function CompanyEditForm({
  companyId,
  name,
  plan,
  features,
}: {
  companyId: number;
  name: string;
  plan: string | null;
  features: Record<string, unknown>;
}) {
  const [planState, setPlanState] = useState<PlanFormState>(() => {
    const f: Record<string, boolean> = {};
    for (const key of Object.keys(FEATURE_DEFS) as FeatureKey[]) f[key] = features?.[key] === true;
    const max = features?.maxAgents;
    return {
      plan: plan ?? "custom",
      features: f,
      maxAgents: typeof max === "number" ? String(max) : "",
    };
  });

  return (
    <form action={updateCompany.bind(null, companyId)} className="card form">
      <h2>Details &amp; plan</h2>
      <label>Company name<input name="name" defaultValue={name} required /></label>
      <PlanFields state={planState} setState={setPlanState} />
      <div>
        <button type="submit">Save</button>
      </div>
    </form>
  );
}
