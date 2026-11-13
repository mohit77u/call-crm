"use client";

import { PLANS, planBySlug } from "@/lib/plans";
import { FEATURE_DEFS, LIMIT_DEFS, type FeatureKey } from "@/lib/features";
import { SelectField, TextField } from "@/components/fields";
import { Check, Info } from "lucide-react";
import { Tooltip } from "@mantine/core";

export type PlanFormState = {
  plan: string;
  features: Record<string, boolean>;
  maxAgents: string;
};

export function stateFromPlan(slug: string): PlanFormState {
  const p = planBySlug(slug);
  if (!p) return { plan: slug, features: {}, maxAgents: "" };
  const features: Record<string, boolean> = {};
  for (const key of Object.keys(FEATURE_DEFS) as FeatureKey[]) features[key] = p.features[key] === true;
  const max = p.features.maxAgents;
  return { plan: slug, features, maxAgents: typeof max === "number" ? String(max) : "" };
}

const PLAN_OPTIONS = [
  ...PLANS.map((p) => ({ value: p.slug, label: `${p.name} — ${p.maxAgents} agents` })),
  { value: "custom", label: "Custom" },
];

export function PlanFields({ state, setState }: { state: PlanFormState; setState: (s: PlanFormState) => void }) {
  const applyPlan = (slug: string) => {
    const p = planBySlug(slug);
    if (p) {
      setState(stateFromPlan(slug));
    } else {
      setState({ ...state, plan: slug });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid max-w-md grid-cols-2 gap-4">
        <SelectField
          name="plan"
          label="Plan"
          data={PLAN_OPTIONS}
          value={state.plan || null}
          onChange={(value) => applyPlan(String(value ?? ""))}
          allowDeselect={false}
          withCheckIcon={false}
          size="sm"
        />
        <TextField
          name="maxAgents"
          label={
            <span className="inline-flex items-center gap-1">
              {LIMIT_DEFS.maxAgents.label}
              <Tooltip label={LIMIT_DEFS.maxAgents.description} position="top" withArrow>
                <Info size={14} className="text-slate-400" />
              </Tooltip>
            </span>
          }
          type="number"
          min={0}
          max={150}
          maxLength={3}
          placeholder="150"
          value={state.maxAgents}
          onChange={(e) => {
            const v = e.target.value;
            setState({ ...state, maxAgents: v === "" ? "" : String(Math.min(150, Math.max(0, Number(v) || 0))) });
          }}
          size="sm"
        />
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-slate-500">Features</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(Object.keys(FEATURE_DEFS) as FeatureKey[]).map((key) => {
            const checked = state.features[key] === true;
            return (
              <label
                key={key}
                className="flex cursor-pointer items-start gap-2.5 rounded-md border border-slate-200 px-3 py-2.5 transition-colors hover:bg-slate-50 has-checked:border-[var(--primary)] has-checked:bg-[var(--primary-soft)]"
              >
                <span
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                    checked ? "border-[var(--primary)] bg-[var(--primary)]" : "border-slate-300 bg-white"
                  }`}
                >
                  {checked && <Check className="h-3 w-3 text-white" strokeWidth={3.5} />}
                </span>
                <input
                  type="checkbox"
                  name={`feature_${key}`}
                  className="sr-only"
                  checked={checked}
                  onChange={(e) => setState({ ...state, features: { ...state.features, [key]: e.target.checked } })}
                />
                <span className="text-sm leading-snug">
                  <span className="font-medium text-slate-800">{FEATURE_DEFS[key].label}</span>
                  <span className="block text-xs text-slate-500">{FEATURE_DEFS[key].description}</span>
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
