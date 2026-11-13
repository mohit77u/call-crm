// Feature/limit registry — must stay in sync with backend/src/shared/features.ts
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

export function featureEnabled(features: Record<string, unknown> | null | undefined, key: FeatureKey) {
  return features?.[key] === true;
}
