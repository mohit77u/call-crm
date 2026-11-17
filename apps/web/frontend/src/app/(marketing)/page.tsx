import Link from "next/link";
import { plansForEdition, inr } from "@/lib/plans";
import { HomeShowcase } from "@/components/home-showcase";
import { HomeFaq } from "@/components/home-faq";

export const metadata = { title: { absolute: "Call CRM — Call tracking & agent CRM for teams" } };

const features = [
  { title: "Automatic call sync", desc: "The Android app uploads call logs on its own — while open and in the background — with zero manual work for agents.", icon: PhoneIcon },
  { title: "Per-agent visibility", desc: "Every call each agent makes or receives, with connected / missed / received status and exact talk time.", icon: ChartIcon },
  { title: "Dual-SIM support", desc: "On dual-SIM phones the agent picks the work SIM once — only that SIM's logs sync to the CRM.", icon: SimIcon },
  { title: "Location tracking", desc: "Optional last-known device location on each check-in, so you always know where field agents are.", icon: PinIcon },
  { title: "Agent CRM portal", desc: "Agents log in on the web to request leads, track assignments and update follow-ups themselves.", icon: PortalIcon },
  { title: "Lead import & bulk actions", desc: "Upload CSVs, map columns, assign or delete leads in bulk — with error reports for every row.", icon: FileIcon },
  { title: "Free trial tracking", desc: "Create and monitor agent-led free trials with day counters and status at a glance.", icon: TrialIcon },
  { title: "Notifications", desc: "Admins and agents get notified on lead requests, import completion and account updates.", icon: BellIcon },
  { title: "CSV exports", desc: "Export call logs, agents, leads and company data for reporting in the tools you already use.", icon: FileIcon },
  { title: "Plan-based features", desc: "Feature flags per company — upgrade, downgrade or customise plans without touching the product.", icon: LayersIcon },
];

const steps = [
  ["1", "We create your company", "Our team sets up your workspace and shares the client code and admin login."],
  ["2", "Add your agents", "Create agent usernames and passwords from the dashboard in seconds."],
  ["3", "Agents install the app", "They enter the client code, log in, and allow call log access once."],
  ["4", "Calls appear automatically", "Every call syncs with status and duration — view, filter and export anytime."],
];

const stats = [
  ["2 editions", "Call logs or full agent CRM"],
  ["10+", "Features across dashboards"],
  ["150", "Agents supported per company"],
  [inr(1999), "Starting price / month"],
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
function PortalIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="14" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><circle cx="8" cy="6.5" r="0.5" fill="currentColor" /></svg>;
}
function TrialIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="13" r="8" /><polyline points="12 9 12 13 15 15" /><path d="M9 2h6" /></svg>;
}
function BellIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>;
}

function DashboardMock() {
  const rows = [
    ["Aarav S.", "98765 43210", "Outgoing", "Connected", "4:32"],
    ["Neha K.", "98111 22334", "Incoming", "Received", "1:18"],
    ["Rohan M.", "90000 11223", "Outgoing", "Missed", "0:00"],
    ["Priya D.", "98222 33445", "Incoming", "Received", "6:05"],
  ];
  return (
    <div className="mock max-[576px]:hidden" aria-hidden="true">
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
  const callsPlans = plansForEdition("calls");
  const crmPlans = plansForEdition("crm");
  return (
    <>
      <section className="hero hero-v2">
        <div className="hero-grid">
          <div className="hero-copy">
            <span className="hero-badge">Call tracking + Agent CRM</span>
            <h1>Every call your team makes,<br />finally <span className="grad-text">visible.</span></h1>
            <p className="hero-sub">
              Call CRM syncs call logs from your agents&rsquo; Android phones into one dashboard —
              and with the Agent CRM edition, your team gets a full lead-management portal of
              their own. No manual entry, no guesswork.
            </p>
            <div className="hero-cta w-full max-w-[760px] flex-wrap justify-start">
              <Link href="/pricing" className="btn btn-lg whitespace-nowrap">View pricing</Link>
              <Link href="/company/login" target="_blank" rel="noopener noreferrer" className="btn btn-lg secondary-ghost whitespace-nowrap">Customer login</Link>
            </div>
            <div className="hero-points">
              <span>✓ Automatic background sync</span>
              <span>✓ Agent CRM portal included</span>
              <span>✓ Plans from ₹1,999/month</span>
            </div>
          </div>
          <DashboardMock />
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-[1120px] grid-cols-2 gap-px bg-slate-200 px-6 py-8 sm:grid-cols-4">
          {stats.map(([v, l]) => (
            <div key={l} className="bg-white px-4 py-2 text-center">
              <div className="text-2xl font-extrabold tracking-tight text-slate-900">{v}</div>
              <div className="mt-1 text-xs font-medium text-slate-500">{l}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-inner">
          <h2 className="section-title">One platform, two editions</h2>
          <p className="section-sub">Start with call tracking — add the agent CRM when your team is ready</p>
          <HomeShowcase />
        </div>
      </section>

      <section className="section section-alt">
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

      <section className="section">
        <div className="section-inner">
          <h2 className="section-title">Everything you need to run calls &amp; leads</h2>
          <p className="section-sub">Built for sales and support teams that live on the phone</p>
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-x-10 gap-y-2 sm:grid-cols-2">
            {features.map((f) => (
              <div key={f.title} className="flex items-start gap-3.5 rounded-xl px-4 py-3.5 transition-colors hover:bg-slate-50">
                <div className="f-ico shrink-0" style={{ width: 38, height: 38, marginBottom: 0, borderRadius: 10 }}><f.icon /></div>
                <div>
                  <h3 className="text-[15px] font-semibold text-slate-900">{f.title}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-slate-500">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="section-inner">
          <h2 className="section-title">Simple pricing</h2>
          <p className="section-sub">Call logs from {inr(callsPlans[0].priceMonthly)}/mo · add Agent CRM from {inr(crmPlans[0].priceMonthly)}/mo</p>
          <div className="plans-preview">
            {callsPlans.map((p) => (
              <div className="plan-card" key={p.slug}>
                <div className="plan-name">{p.name}</div>
                <div className="muted" style={{ fontSize: 13, margin: "8px 0 4px" }}>{p.tagline}</div>
                <div className="plan-price" style={{ fontSize: 26 }}>{inr(p.priceMonthly)}<span>/mo</span></div>
                <div className="muted" style={{ fontSize: 13 }}><b style={{ color: "var(--text)" }}>{p.maxAgents}</b> agents · call logs</div>
                <Link href="/pricing" className="btn secondary" style={{ marginTop: 14 }}>Learn more</Link>
              </div>
            ))}
          </div>
          <div className="plan-card mx-auto mt-5 flex max-w-md flex-col items-center border-[var(--primary)]/40 text-center" style={{ borderStyle: "solid" }}>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--primary)]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[var(--primary)]">
              Agent CRM edition
            </div>
            <div className="plan-name mt-3">Call logs + Agent CRM</div>
            <div className="muted" style={{ fontSize: 13, margin: "8px 0 12px" }}>Same tiers — agent portal, lead requests &amp; lead import included</div>
            <div className="plan-price" style={{ fontSize: 26 }}>{inr(crmPlans[0].priceMonthly)}<span>/mo onwards</span></div>
            <Link href="/pricing" className="btn" style={{ marginTop: 14 }}>Compare editions</Link>
          </div>
          <p style={{ textAlign: "center", marginTop: 18 }}>
            <Link href="/pricing">See plans &amp; pricing →</Link>
          </p>
        </div>
      </section>

      <section className="section">
        <div className="section-inner">
          <h2 className="section-title">Frequently asked questions</h2>
          <p className="section-sub">Everything teams usually ask before getting started</p>
          <HomeFaq />
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
