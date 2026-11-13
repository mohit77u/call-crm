import { defaultFeatures, type CompanyFeatures } from "./features";

// Subscription plan presets. The superadmin picks a plan when creating a company;
// the plan maps to feature flags + limits stored in companies.features.
// Prices are in INR.

export type PlanSlug = "basic" | "pro" | "enterprise";

export type PlanDef = {
  slug: PlanSlug;
  name: string;
  tagline: string;
  priceMonthly: number;
  priceYearly: number; // billed annually (2 months free)
  maxAgents: number;
  features: CompanyFeatures;
  highlights: string[];
};

const allFeatures = (): CompanyFeatures => ({
  ...defaultFeatures(),
  locations: true,
  exports: true,
  reports: true,
  maxAgents: null,
});

export const PLANS: Record<PlanSlug, PlanDef> = {
  basic: {
    slug: "basic",
    name: "Basic",
    tagline: "For small teams getting started",
    priceMonthly: 1999,
    priceYearly: 19990,
    maxAgents: 10,
    features: {
      callSync: true,
      locations: false,
      exports: false,
      reports: true,
      leadManagement: true,
      maxAgents: 10,
    },
    highlights: ["Up to 10 agents", "Call sync & dashboard reports", "Lead management", "Android app access"],
  },
  pro: {
    slug: "pro",
    name: "Pro",
    tagline: "For growing sales teams",
    priceMonthly: 3999,
    priceYearly: 39990,
    maxAgents: 25,
    features: { ...allFeatures(), maxAgents: 25 },
    highlights: ["Up to 25 agents", "Location tracking", "CSV exports", "Dashboard reports", "Lead management"],
  },
  enterprise: {
    slug: "enterprise",
    name: "Enterprise",
    tagline: "For larger organizations",
    priceMonthly: 5999,
    priceYearly: 59990,
    maxAgents: 50,
    features: { ...allFeatures(), maxAgents: 50 },
    highlights: ["Up to 50 agents", "Location tracking", "CSV exports", "Dashboard reports", "Lead management", "Priority support"],
  },
};

export const PLAN_SLUGS = Object.keys(PLANS) as PlanSlug[];

export function isPlanSlug(v: unknown): v is PlanSlug {
  return typeof v === "string" && v in PLANS;
}

export function planFeatures(slug: PlanSlug): CompanyFeatures {
  return PLANS[slug].features;
}
