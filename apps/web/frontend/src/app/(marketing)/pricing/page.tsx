import type { Metadata } from "next";
import PricingClient from "./pricing-client";

export const metadata: Metadata = { title: "Pricing — Call CRM" };

export default function PricingPage() {
  return (
    <section className="section" style={{ paddingTop: 48 }}>
      <div className="section-inner">
        <h1 className="section-title" style={{ fontSize: 32 }}>Simple, transparent pricing</h1>
        <p className="section-sub">Every plan includes the Android app, automatic call sync and agent management. Upgrade or downgrade anytime.</p>
        <PricingClient />
      </div>
    </section>
  );
}
