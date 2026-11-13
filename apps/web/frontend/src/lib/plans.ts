// Subscription plan presets — must stay in sync with backend/src/shared/plans.ts
import type { FeatureKey } from "./features";

export type PlanSlug = "basic" | "pro" | "enterprise";

export type PlanDef = {
  slug: PlanSlug;
  name: string;
  tagline: string;
  priceMonthly: number;
  priceYearly: number;
  maxAgents: number;
  features: Record<FeatureKey, boolean> & { maxAgents: number };
  highlights: string[];
};

export const PLANS: PlanDef[] = [
  {
    slug: "basic",
    name: "Basic",
    tagline: "For small teams getting started",
    priceMonthly: 1999,
    priceYearly: 19990,
    maxAgents: 10,
    features: { callSync: true, locations: false, exports: false, reports: true, leadManagement: true, maxAgents: 10 },
    highlights: ["Up to 10 agents", "Call sync & dashboard reports", "Lead management", "Android app access"],
  },
  {
    slug: "pro",
    name: "Pro",
    tagline: "For growing sales teams",
    priceMonthly: 3999,
    priceYearly: 39990,
    maxAgents: 25,
    features: { callSync: true, locations: true, exports: true, reports: true, leadManagement: true, maxAgents: 25 },
    highlights: ["Up to 25 agents", "Location tracking", "CSV exports", "Dashboard reports", "Lead management"],
  },
  {
    slug: "enterprise",
    name: "Enterprise",
    tagline: "For larger organizations",
    priceMonthly: 5999,
    priceYearly: 59990,
    maxAgents: 50,
    features: { callSync: true, locations: true, exports: true, reports: true, leadManagement: true, maxAgents: 50 },
    highlights: ["Up to 50 agents", "Location tracking", "CSV exports", "Dashboard reports", "Lead management", "Priority support"],
  },
];

export function planBySlug(slug: string | null | undefined): PlanDef | null {
  return PLANS.find((p) => p.slug === slug) ?? null;
}

export function planDisplayName(plan: string | null | undefined): string {
  if (!plan) return "Custom";
  return planBySlug(plan)?.name ?? "Custom";
}

export function inr(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}
