// Feature/limit registry — must stay in sync with backend/src/shared/features.ts
export const FEATURE_DEFS = {
  callSync: { label: "Call sync", description: "Allow the Android app to upload call logs" },
  locations: { label: "Location tracking", description: "Store last known device location from heartbeats" },
  exports: { label: "CSV exports", description: "Export call logs, agents and companies as CSV" },
  reports: { label: "Reports & dashboard", description: "Dashboard stats and call analytics" },
} as const;

export type FeatureKey = keyof typeof FEATURE_DEFS;

export const LIMIT_DEFS = {
  maxAgents: { label: "Max agents", description: "Maximum agents per company (empty = unlimited)" },
} as const;

export type LimitKey = keyof typeof LIMIT_DEFS;

export function featureEnabled(features: Record<string, unknown> | null | undefined, key: FeatureKey) {
  return features?.[key] === true;
}
