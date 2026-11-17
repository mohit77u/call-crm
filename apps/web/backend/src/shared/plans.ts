import type { CompanyFeatures } from "./features";

// Subscription plan presets. The superadmin picks a plan when creating a company;
// the plan maps to feature flags + limits stored in companies.features.
// Prices are in INR.
//
// Two editions share the same agent tiers:
//   - "calls" : call logs + dashboard only (no agent CRM portal)
//   - "crm"   : call logs + agent CRM (lead management, agent portal, trials)

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
  priceYearly: number; // billed annually (2 months free)
  maxAgents: number;
  features: CompanyFeatures;
  highlights: string[];
};

const callsFeatures = (maxAgents: number, opts?: { locations?: boolean; exports?: boolean; reports?: boolean }): CompanyFeatures => ({
  callSync: true,
  locations: opts?.locations ?? false,
  exports: opts?.exports ?? false,
  reports: opts?.reports ?? true,
  leadManagement: false,
  maxAgents,
});

const crmFeatures = (maxAgents: number, opts?: { locations?: boolean; exports?: boolean; reports?: boolean }): CompanyFeatures => ({
  ...callsFeatures(maxAgents, opts),
  leadManagement: true,
});

function tierDef(tier: PlanTier, edition: PlanEdition): PlanDef {
  const crm = edition === "crm";
  const base = {
    basic: {
      name: "Basic",
      tagline: "For small teams getting started",
      maxAgents: 10,
      priceMonthly: crm ? 4999 : 1999,
      priceYearly: crm ? 49999 : 19999,
      features: callsFeatures(10),
      highlights: ["Up to 10 agents", "Call sync & call logs", "Android app access"],
    },
    pro: {
      name: "Pro",
      tagline: "For growing sales teams",
      maxAgents: 25,
      priceMonthly: crm ? 8999 : 3999,
      priceYearly: crm ? 89999 : 39999,
      features: callsFeatures(25, { locations: true, exports: true, reports: true }),
      highlights: ["Up to 25 agents", "Location tracking", "CSV exports", "Dashboard reports"],
    },
    enterprise: {
      name: "Enterprise",
      tagline: "For larger organizations",
      maxAgents: 50,
      priceMonthly: crm ? 11999 : 5999,
      priceYearly: crm ? 119999 : 59999,
      features: callsFeatures(50, { locations: true, exports: true, reports: true }),
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
    features: crm ? { ...base.features, leadManagement: true } : base.features,
    highlights: crm ? crmHighlights : base.highlights,
  };
}

const TIERS: PlanTier[] = ["basic", "pro", "enterprise"];
const EDITIONS: PlanEdition[] = ["calls", "crm"];

export const PLANS: Record<PlanSlug, PlanDef> = Object.fromEntries(
  EDITIONS.flatMap((edition) => TIERS.map((tier) => {
    const def = tierDef(tier, edition);
    return [def.slug, def];
  })),
) as Record<PlanSlug, PlanDef>;

export const PLAN_SLUGS = Object.keys(PLANS) as PlanSlug[];

export function isPlanSlug(v: unknown): v is PlanSlug {
  return typeof v === "string" && v in PLANS;
}

export function planFeatures(slug: PlanSlug): CompanyFeatures {
  return PLANS[slug].features;
}

export function plansByEdition(edition: PlanEdition): PlanDef[] {
  return TIERS.map((tier) => PLANS[crmSlug(tier, edition)]);
}

export function crmSlug(tier: PlanTier, edition: PlanEdition): PlanSlug {
  return edition === "crm" ? `${tier}-crm` : tier;
}
