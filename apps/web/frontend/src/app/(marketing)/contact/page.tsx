import type { Metadata } from "next";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = { title: "Contact us — Call CRM" };

export default function ContactPage() {
  return (
    <section className="section" style={{ paddingTop: 48 }}>
      <div className="section-inner" style={{ maxWidth: 640 }}>
        <h1 className="section-title" style={{ fontSize: 30 }}>Get in touch</h1>
        <p className="section-sub" style={{ marginBottom: 28 }}>
          Tell us about your team and the plan you are interested in — we will get back to you with next steps.
        </p>
        <ContactForm selectedPlan="" />
      </div>
    </section>
  );
}
