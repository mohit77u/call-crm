"use client";

import { PLANS, planBySlug } from "@/lib/plans";
import { FEATURE_DEFS, LIMIT_DEFS, type FeatureKey } from "@/lib/features";

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

export function PlanFields({ state, setState }: { state: PlanFormState; setState: (s: PlanFormState) => void }) {
  const applyPlan = (slug: string) => {
    const p = planBySlug(slug);
    if (p) {
      const next = stateFromPlan(slug);
      setState(next);
    } else {
      setState({ ...state, plan: slug });
    }
  };

  return (
    <>
      <label>
        Plan
        <select name="plan" value={state.plan} onChange={(e) => applyPlan(e.target.value)}>
          {PLANS.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name} — {p.maxAgents} agents
            </option>
          ))}
          <option value="custom">Custom</option>
        </select>
      </label>
      <div className="feature-grid">
        {(Object.keys(FEATURE_DEFS) as FeatureKey[]).map((key) => (
          <label key={key} className="feature-toggle">
            <input
              type="checkbox"
              name={`feature_${key}`}
              checked={state.features[key] === true}
              onChange={(e) => setState({ ...state, features: { ...state.features, [key]: e.target.checked } })}
            />
            <span>
              <b>{FEATURE_DEFS[key].label}</b>
              <span className="muted"> — {FEATURE_DEFS[key].description}</span>
            </span>
          </label>
        ))}
      </div>
      <label style={{ maxWidth: 220 }}>
        {LIMIT_DEFS.maxAgents.label}
        <input
          name="maxAgents"
          type="number"
          min={0}
          placeholder="Unlimited"
          value={state.maxAgents}
          onChange={(e) => setState({ ...state, maxAgents: e.target.value })}
        />
        <span className="muted">{LIMIT_DEFS.maxAgents.description}</span>
      </label>
    </>
  );
}
