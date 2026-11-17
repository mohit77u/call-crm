// Subscription plan presets — must stay in sync with backend/src/shared/plans.ts
import type { FeatureKey } from "./features";

export type PlanEdition = "calls" | "crm";
export type PlanTier = "basic" | "pro" | "enterprise";
export type PlanSlug = PlanTier | `${PlanTier}-crm`;

export type PlanDef = {
  slug: PlanSlug;
  tier: PlanTier;
  edition: PlanEdition;
  name: string;
  tagline: string;
  priceMonthly: number;
  priceYearly: number;
  maxAgents: number;
  features: Record<FeatureKey, boolean> & { maxAgents: number };
  highlights: string[];
};

const TIERS: PlanTier[] = ["basic", "pro", "enterprise"];
const EDITIONS: PlanEdition[] = ["calls", "crm"];

function tierDef(tier: PlanTier, edition: PlanEdition): PlanDef {
  const crm = edition === "crm";
  const base = {
    basic: {
      name: "Basic",
      tagline: "For small teams getting started",
      maxAgents: 10,
      priceMonthly: crm ? 2999 : 1999,
      priceYearly: crm ? 29990 : 19990,
      features: { callSync: true, locations: false, exports: false, reports: true, leadManagement: false, maxAgents: 10 },
      highlights: ["Up to 10 agents", "Call sync & call logs", "Android app access"],
    },
    pro: {
      name: "Pro",
      tagline: "For growing sales teams",
      maxAgents: 25,
      priceMonthly: crm ? 4999 : 3999,
      priceYearly: crm ? 49990 : 39990,
      features: { callSync: true, locations: true, exports: true, reports: true, leadManagement: false, maxAgents: 25 },
      highlights: ["Up to 25 agents", "Location tracking", "CSV exports", "Dashboard reports"],
    },
    enterprise: {
      name: "Enterprise",
      tagline: "For larger organizations",
      maxAgents: 50,
      priceMonthly: crm ? 6999 : 5999,
      priceYearly: crm ? 69990 : 59990,
      features: { callSync: true, locations: true, exports: true, reports: true, leadManagement: false, maxAgents: 50 },
      highlights: ["Up to 50 agents", "Location tracking", "CSV exports", "Dashboard reports", "Priority support"],
    },
  }[tier];

  const crmHighlights = {
    basic: ["Everything in Basic", "Agent CRM portal", "Lead management & assignment", "Free trial tracking"],
    pro: ["Everything in Pro", "Agent CRM portal", "Lead management & assignment", "Lead import & bulk actions"],
    enterprise: ["Everything in Enterprise", "Agent CRM portal", "Lead management & assignment", "Lead import & bulk actions", "Priority support"],
  }[tier];

  return {
    slug: crm ? `${tier}-crm` : tier,
    tier,
    edition,
    name: crm ? `${base.name} + CRM` : base.name,
    tagline: base.tagline,
    priceMonthly: base.priceMonthly,
    priceYearly: base.priceYearly,
    maxAgents: base.maxAgents,
    features: { ...base.features, leadManagement: crm },
    highlights: crm ? crmHighlights : base.highlights,
  };
}

export const PLANS: PlanDef[] = EDITIONS.flatMap((edition) => TIERS.map((tier) => tierDef(tier, edition)));

export function planBySlug(slug: string | null | undefined): PlanDef | null {
  return PLANS.find((p) => p.slug === slug) ?? null;
}

export function planDisplayName(plan: string | null | undefined): string {
  if (!plan) return "Custom";
  return planBySlug(plan)?.name ?? "Custom";
}

export function plansForEdition(edition: PlanEdition): PlanDef[] {
  return PLANS.filter((p) => p.edition === edition);
}

export function inr(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}
