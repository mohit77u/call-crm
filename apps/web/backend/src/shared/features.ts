// Feature flags + plan limits stored per company in companies.features (JSONB).
// Boolean keys are on/off features; numeric keys are limits (null = unlimited).
// This is the base for future subscription plans — the superadmin toggles these per company.

export const FEATURE_DEFS = {
  callSync: { label: "Call Sync", description: "Allow the Android app to upload call logs" },
  locations: { label: "Location Tracking", description: "Store last known device location from heartbeats" },
  exports: { label: "CSV Exports", description: "Export call logs, agents and companies as CSV" },
  reports: { label: "Reports & Dashboard", description: "Dashboard stats and call analytics" },
  leadManagement: { label: "Lead Management", description: "Agent lead requests, assignment and lead tracking" },
} as const;

export type FeatureKey = keyof typeof FEATURE_DEFS;

export const LIMIT_DEFS = {
  maxAgents: { label: "Max Agents", description: "Maximum agents per company — up to 150" },
} as const;

export type LimitKey = keyof typeof LIMIT_DEFS;

export type CompanyFeatures = Partial<Record<FeatureKey, boolean>> & Partial<Record<LimitKey, number | null>>;

export function defaultFeatures(): Required<Record<FeatureKey, boolean>> & Record<LimitKey, null> {
  return {
    callSync: true,
    locations: true,
    exports: true,
    reports: true,
    leadManagement: true,
    maxAgents: null,
  };
}

export function normalizeFeatures(raw: unknown): CompanyFeatures {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out: CompanyFeatures = {};
  for (const key of Object.keys(FEATURE_DEFS) as FeatureKey[]) {
    out[key] = obj[key] === true;
  }
  for (const key of Object.keys(LIMIT_DEFS) as LimitKey[]) {
    const v = obj[key];
    out[key] = typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : null;
  }
  return out;
}

// Merge a partial patch over a base features object.
// Only keys explicitly present in `patch` are applied; everything else keeps the base value.
export function mergeFeatures(base: unknown, patch: unknown): CompanyFeatures {
  const baseNorm = normalizeFeatures(base);
  const patchObj = patch && typeof patch === "object" ? (patch as Record<string, unknown>) : {};
  const out: CompanyFeatures = { ...baseNorm };
  for (const key of Object.keys(FEATURE_DEFS) as FeatureKey[]) {
    if (key in patchObj) out[key] = patchObj[key] === true;
  }
  for (const key of Object.keys(LIMIT_DEFS) as LimitKey[]) {
    if (key in patchObj) {
      const v = patchObj[key];
      out[key] = typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : null;
    }
  }
  return out;
}

export function hasFeature(company: { features?: unknown } | null | undefined, key: FeatureKey): boolean {
  if (!company) return false;
  const f = normalizeFeatures(company.features);
  return f[key] === true;
}

export function featureLimit(company: { features?: unknown } | null | undefined, key: LimitKey): number | null {
  if (!company) return null;
  const f = normalizeFeatures(company.features);
  const v = f[key];
  return typeof v === "number" ? v : null;
}
