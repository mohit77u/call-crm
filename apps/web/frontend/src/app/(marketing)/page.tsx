import Link from "next/link";
import { PLANS } from "@/lib/plans";

export const metadata = { title: { absolute: "Call CRM — Call tracking for sales teams" } };

const features = [
  { title: "Automatic call sync", desc: "The Android app uploads call logs on its own — while open and in the background — with zero manual work for agents.", icon: PhoneIcon },
  { title: "Per-agent visibility", desc: "Every call each agent makes or receives, with connected / missed / received status and exact talk time.", icon: ChartIcon },
  { title: "Dual-SIM support", desc: "On dual-SIM phones the agent picks the work SIM once — only that SIM's logs sync to the CRM.", icon: SimIcon },
  { title: "Location tracking", desc: "Optional last-known device location on each check-in, so you always know where field agents are.", icon: PinIcon },
  { title: "CSV exports", desc: "Export call logs, agents and company data for reporting in the tools you already use.", icon: FileIcon },
  { title: "Plan-based features", desc: "Feature flags per company — upgrade or downgrade plans without touching the product.", icon: LayersIcon },
];

const steps = [
  ["1", "We create your company", "Our team sets up your workspace and shares the client code and admin login."],
  ["2", "Add your agents", "Create agent usernames and passwords from the dashboard in seconds."],
  ["3", "Agents install the app", "They enter the client code, log in, and allow call log access once."],
  ["4", "Calls appear automatically", "Every call syncs with status and duration — view, filter and export anytime."],
];

function PhoneIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="2" width="10" height="20" rx="2.5" /><line x1="11" y1="18" x2="13" y2="18" /></svg>;
}
function ChartIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="20" x2="6" y2="14" /><line x1="12" y1="20" x2="12" y2="9" /><line x1="18" y1="20" x2="18" y2="5" /></svg>;
}
function SimIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="2" width="10" height="20" rx="2.5" /><path d="M12 6h.01M12 10h.01M12 14h.01" /></svg>;
}
function PinIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>;
}
function FileIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>;
}
function LayersIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>;
}

function DashboardMock() {
  const rows = [
    ["Aarav S.", "98765 43210", "Outgoing", "Connected", "4:32"],
    ["Neha K.", "98111 22334", "Incoming", "Received", "1:18"],
    ["Rohan M.", "90000 11223", "Outgoing", "Missed", "0:00"],
    ["Priya D.", "98222 33445", "Incoming", "Received", "6:05"],
  ];
  return (
    <div className="mock" aria-hidden="true">
      <div className="mock-bar">
        <span className="dot" /><span className="dot" /><span className="dot" />
        <span className="mock-url">app.callcrm.in/calls</span>
      </div>
      <div className="mock-stats">
        <div className="mock-stat"><b>1,284</b><span>Total calls</span></div>
        <div className="mock-stat"><b>62%</b><span>Connected</span></div>
        <div className="mock-stat"><b>18h 40m</b><span>Talk time</span></div>
      </div>
      <div className="mock-row head"><span>Agent</span><span>Number</span><span>Type</span><span>Status</span><span>Dur.</span></div>
      {rows.map((r) => (
        <div className="mock-row" key={r[0]}>
          <span>{r[0]}</span><span>{r[1]}</span>
          <span className={`mock-type ${r[2].toLowerCase()}`}>{r[2]}</span>
          <span className={`mock-badge ${r[4] === "0:00" ? "missed" : "ok"}`}>{r[4] === "0:00" ? "Missed" : r[3]}</span>
          <span>{r[4]}</span>
        </div>
      ))}
      <div className="mock-sync">
        <span className="pulse" /> Live — synced 12s ago
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <section className="hero hero-v2">
        <div className="hero-grid">
          <div className="hero-copy">
            <span className="hero-badge">Call tracking CRM for teams</span>
            <h1>Every call your team makes,<br />finally <span className="grad-text">visible.</span></h1>
            <p className="hero-sub">
              Call CRM syncs call logs from your agents&rsquo; Android phones into one dashboard —
              per-agent stats, status tracking, location and exports. No manual entry, no guesswork.
            </p>
            <div className="hero-cta">
              <Link href="/pricing" className="btn btn-lg">View pricing</Link>
              <Link href="/company/login" target="_blank" rel="noopener noreferrer" className="btn btn-lg secondary-ghost">Customer login</Link>
            </div>
            <div className="hero-points">
              <span>✓ Automatic background sync</span>
              <span>✓ Works on any Android phone</span>
              <span>✓ Plans from ₹1,999/month</span>
            </div>
          </div>
          <DashboardMock />
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
                <div className="f-ico"><f.icon /></div>
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
