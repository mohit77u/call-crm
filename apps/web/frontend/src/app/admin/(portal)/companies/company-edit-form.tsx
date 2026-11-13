"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateCompany } from "./actions";
import { PlanFields, type PlanFormState } from "./plan-fields";
import { FEATURE_DEFS, type FeatureKey } from "@/lib/features";
import { notify } from "@/lib/notify";

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
  const router = useRouter();
  const [pending, startTransition] = useTransition();
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
    <form
      className="card form"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          const res = await updateCompany(companyId, fd);
          if (res.error) notify.error(res.error);
          else {
            notify.success(res.notice ?? "Saved");
            router.refresh();
          }
        });
      }}
    >
      <h2>Details &amp; plan</h2>
      <label>Company name<input name="name" defaultValue={name} required /></label>
      <PlanFields state={planState} setState={setPlanState} />
      <div>
        <button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
      </div>
    </form>
  );
}
