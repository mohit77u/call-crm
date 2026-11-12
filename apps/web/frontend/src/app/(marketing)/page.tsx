import Link from "next/link";
import { PLANS } from "@/lib/plans";

export const metadata = { title: { absolute: "Call CRM — Call tracking for sales teams" } };


const features = [
  { title: "Automatic call sync", desc: "The Android app uploads call logs automatically — when opened and in the background — with no manual work for agents." },
  { title: "Per-agent visibility", desc: "See every call each agent makes or receives, with connected / missed / received status and exact talk time." },
  { title: "Dual-SIM support", desc: "On dual-SIM phones the agent picks the work SIM once — only that SIM's call logs sync to the CRM." },
  { title: "Location tracking", desc: "Optional last-known device location on each heartbeat, so you know where field agents are." },
  { title: "CSV exports", desc: "Export call logs, agents and company data for reporting in your own tools." },
  { title: "Plan-based features", desc: "Feature flags per company — upgrade or downgrade plans without changing the product." },
];

const steps = [
  ["1", "We create your company", "Our team sets up your workspace and shares the client code and admin login."],
  ["2", "Add your agents", "Create agent usernames and passwords from the dashboard in seconds."],
  ["3", "Agents install the app", "They enter the client code, log in, and allow call log access once."],
  ["4", "Calls appear automatically", "Every call syncs with status and duration — view, filter and export anytime."],
];

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <span className="hero-badge">Call tracking CRM for teams</span>
          <h1>Every call your team makes,<br />finally visible.</h1>
          <p className="hero-sub">
            Call CRM syncs call logs from your agents&rsquo; Android phones into one dashboard —
            with per-agent stats, status tracking, location and exports. No manual entry, no guesswork.
          </p>
          <div className="hero-cta">
            <Link href="/pricing" className="btn btn-lg">View pricing</Link>
            <Link href="/company/login" className="btn btn-lg secondary-ghost">Customer login</Link>
          </div>
          <div className="hero-points">
            <span>✓ Automatic background sync</span>
            <span>✓ Works on any Android phone</span>
            <span>✓ Plans from ₹1,999/month</span>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-inner">
          <h2 className="section-title">How it works</h2>
          <p className="section-sub">Live in under 15 minutes</p>
          <div className="steps-grid">
            {steps.map(([n, t, d]) => (
              <div className="step-card" key={n}>
                <div className="step-num">{n}</div>
                <h3>{t}</h3>
                <p className="muted">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="section-inner">
          <h2 className="section-title">Everything you need to track calls</h2>
          <p className="section-sub">Built for sales and support teams that live on the phone</p>
          <div className="features-grid">
            {features.map((f) => (
              <div className="feature-card" key={f.title}>
                <h3>{f.title}</h3>
                <p className="muted">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-inner">
          <h2 className="section-title">Simple pricing</h2>
          <p className="section-sub">Start small, scale when your team grows</p>
          <div className="plans-preview">
            {PLANS.map((p) => (
              <div className="plan-card" key={p.slug}>
                <div className="plan-name">{p.name}</div>
                <div className="muted" style={{ fontSize: 13, margin: "8px 0 4px" }}>{p.tagline}</div>
                <div className="muted" style={{ fontSize: 13 }}><b style={{ color: "var(--text)" }}>{p.maxAgents}</b> agents included</div>
                <Link href="/pricing" className="btn secondary" style={{ marginTop: 14 }}>Learn more</Link>
              </div>
            ))}
          </div>
          <p style={{ textAlign: "center", marginTop: 18 }}>
            <Link href="/pricing">See plans &amp; pricing →</Link>
          </p>
        </div>
      </section>

      <section className="cta-banner">
        <div className="section-inner cta-inner">
          <h2>Ready to see every call?</h2>
          <p>Pick a plan and we will set up your workspace the same day.</p>
          <Link href="/pricing" className="btn btn-lg">Get started</Link>
        </div>
      </section>
    </>
  );
}
