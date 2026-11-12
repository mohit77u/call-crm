import type { Metadata } from "next";
import { PLANS, planBySlug } from "@/lib/plans";
import { submitEnquiry } from "./actions";

export const metadata: Metadata = { title: "Contact us — Call CRM" };

export default async function ContactPage({ searchParams }: PageProps<"/contact">) {
  const sp = await searchParams;
  const planParam = typeof sp.plan === "string" ? sp.plan : "";
  const selectedPlan = planBySlug(planParam)?.slug ?? "";
  const sent = sp.sent === "1";
  const error = typeof sp.error === "string" ? sp.error : "";

  return (
    <section className="section" style={{ paddingTop: 48 }}>
      <div className="section-inner" style={{ maxWidth: 640 }}>
        <h1 className="section-title" style={{ fontSize: 30 }}>Get in touch</h1>
        <p className="section-sub" style={{ marginBottom: 28 }}>
          Tell us about your team and the plan you are interested in — we will get back to you with next steps.
        </p>
        <form action={submitEnquiry} className="card form">
          {sent && <div className="notice">Thanks! Your enquiry has been sent — we will contact you shortly.</div>}
          {error && <div className="error">{error}</div>}
          <label>Name<input name="name" required autoFocus /></label>
          <label>Email<input name="email" type="email" required /></label>
          <label>Company (optional)<input name="company" /></label>
          <label>Plan
            <select name="plan" defaultValue={selectedPlan}>
              <option value="">Not sure yet</option>
              {PLANS.map((p) => (
                <option key={p.slug} value={p.slug}>{p.name} — up to {p.maxAgents} agents</option>
              ))}
              <option value="custom">Custom / enterprise</option>
            </select>
          </label>
          <label>Message (optional)<textarea name="message" rows={4} placeholder="Team size, use case, questions…" /></label>
          <div><button type="submit">Send enquiry</button></div>
        </form>
      </div>
    </section>
  );
}
