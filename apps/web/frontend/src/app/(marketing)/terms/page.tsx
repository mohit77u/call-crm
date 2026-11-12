import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms & Conditions — Call CRM" };

export default function TermsPage() {
  return (
    <section className="section" style={{ paddingTop: 48 }}>
      <div className="section-inner prose">
        <h1 className="section-title">Terms &amp; Conditions</h1>
        <p className="muted">Last updated: {new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}</p>

        <h2>1. The service</h2>
        <p>
          Call CRM provides a web dashboard and Android application that syncs call log data from
          agents&rsquo; devices to a company workspace. Access is provided on a subscription basis and is
          managed by the platform administrator.
        </p>

        <h2>2. Accounts</h2>
        <p>
          Company accounts are created by Call CRM administrators only. Each company is responsible
          for the agents it adds, the credentials it issues, and ensuring agents are informed about
          and consent to call-log syncing on their devices where required by applicable law.
        </p>

        <h2>3. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the service for any unlawful purpose or to violate any person&rsquo;s privacy rights;</li>
          <li>Attempt to access another company&rsquo;s data or circumvent authentication;</li>
          <li>Interfere with or disrupt the service, including automated scraping beyond provided exports;</li>
          <li>Reverse engineer the mobile app or backend except where permitted by law.</li>
        </ul>

        <h2>4. Billing</h2>
        <p>
          Subscription fees are as published on the pricing page and are billed monthly or annually in
          advance, exclusive of applicable taxes. Plan changes take effect as configured by the
          administrator.
        </p>

        <h2>5. Your data</h2>
        <p>
          Call log data uploaded through the app belongs to your company. We process it solely to
          provide the service. See our <a href="/privacy">Privacy Policy</a> for details.
        </p>

        <h2>6. Availability</h2>
        <p>
          We aim for high availability but do not guarantee uninterrupted service. Scheduled
          maintenance, if any, will be notified in advance where practicable.
        </p>

        <h2>7. Limitation of liability</h2>
        <p>
          The service is provided &ldquo;as is&rdquo;. To the maximum extent permitted by law, Call CRM is not
          liable for indirect or consequential damages, or for loss of data beyond what is reasonably
          recoverable from backups.
        </p>

        <h2>8. Termination</h2>
        <p>
          Either party may end the service with reasonable notice. On termination, access is revoked
          and data is retained for a limited period before deletion, unless otherwise agreed.
        </p>

        <h2>9. Changes</h2>
        <p>
          We may update these terms from time to time. Continued use of the service after changes
          constitutes acceptance.
        </p>
      </div>
    </section>
  );
}
