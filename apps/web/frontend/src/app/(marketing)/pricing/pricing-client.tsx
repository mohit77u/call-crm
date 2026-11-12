"use client";

import { useState } from "react";
import Link from "next/link";
import { PLANS, inr, type PlanDef } from "@/lib/plans";
import { FEATURE_DEFS, LIMIT_DEFS, type FeatureKey, type LimitKey } from "@/lib/features";

function Check({ ok }: { ok: boolean }) {
  return ok ? <span className="cmp-yes">✓</span> : <span className="cmp-no">—</span>;
}

function PlanCard({ plan, yearly }: { plan: PlanDef; yearly: boolean }) {
  const price = yearly ? plan.priceYearly : plan.priceMonthly;
  const perMonth = yearly ? Math.round(plan.priceYearly / 12) : plan.priceMonthly;
  return (
    <div className={`plan-card-lg${plan.slug === "pro" ? " featured" : ""}`}>
      {plan.slug === "pro" && <div className="plan-badge">Most popular</div>}
      <div className="plan-name">{plan.name}</div>
      <div className="plan-tagline muted">{plan.tagline}</div>
      <div className="plan-price-lg">
        {inr(price)}
        <span className="plan-period">/{yearly ? "year" : "month"}</span>
      </div>
      {yearly && <div className="plan-note muted">{inr(perMonth)}/mo billed annually · 2 months free</div>}
      <div className="plan-agents"><b>{plan.maxAgents}</b> agents included</div>
      <ul className="plan-highlights">
        {plan.highlights.map((h) => (
          <li key={h}><span className="cmp-yes">✓</span> {h}</li>
        ))}
      </ul>
      <Link className={`btn${plan.slug === "pro" ? "" : " secondary"}`} href={`/contact?plan=${plan.slug}`} style={{ width: "100%", textAlign: "center" }}>
        Get {plan.name}
      </Link>
    </div>
  );
}

export default function PricingClient() {
  const [yearly, setYearly] = useState(false);
  const featureKeys = Object.keys(FEATURE_DEFS) as FeatureKey[];
  const limitKeys = Object.keys(LIMIT_DEFS) as LimitKey[];

  return (
    <>
      <div className="billing-toggle">
        <button type="button" className={!yearly ? "active" : ""} onClick={() => setYearly(false)}>Monthly</button>
        <button type="button" className={yearly ? "active" : ""} onClick={() => setYearly(true)}>
          Yearly <span className="save-tag">save ~17%</span>
        </button>
      </div>

      <div className="plans-grid-lg">
        {PLANS.map((p) => <PlanCard key={p.slug} plan={p} yearly={yearly} />)}
      </div>
      <p className="muted" style={{ textAlign: "center", marginTop: 10 }}>
        Prices in INR, exclusive of GST. Need more than 50 agents or custom features? <Link href="/contact">Contact us</Link>.
      </p>

      <div className="card" style={{ marginTop: 34 }}>
        <h2>Compare plans</h2>
        <div className="cmp-table-wrap">
          <table className="cmp-table">
            <thead>
              <tr>
                <th></th>
                {PLANS.map((p) => <th key={p.slug}>{p.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {limitKeys.map((k) => (
                <tr key={k}>
                  <td>{LIMIT_DEFS[k].label}</td>
                  {PLANS.map((p) => <td key={p.slug} className="cmp-center">{p.features[k] ?? "Unlimited"}</td>)}
                </tr>
              ))}
              {featureKeys.map((k) => (
                <tr key={k}>
                  <td>{FEATURE_DEFS[k].label}</td>
                  {PLANS.map((p) => <td key={p.slug} className="cmp-center"><Check ok={p.features[k] === true} /></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h2>How to get started</h2>
        <p className="muted">
          Accounts are created by our team — there is no public signup. Send us an enquiry with your
          plan choice and we will set up your company workspace, share the client code and admin
          login, and help your agents install the app.
        </p>
        <p className="muted">Ready? <Link href="/contact">Contact us to get started</Link>. Already a customer? <Link href="/company/login">Log in here</Link>.</p>
      </div>
    </>
  );
}
