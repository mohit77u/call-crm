import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy — Call CRM" };

export default function PrivacyPage() {
  return (
    <section className="section" style={{ paddingTop: 48 }}>
      <div className="section-inner prose">
        <h1 className="section-title">Privacy Policy</h1>
        <p className="muted">Last updated: {new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}</p>

        <h2>What we collect</h2>
        <ul>
          <li><b>Account data:</b> company name, admin name and email, and agent names, usernames and phone numbers you provide.</li>
          <li><b>Call log data:</b> phone numbers dialed or received, contact names, call type, timestamp, duration and SIM label — read from the Android call log by the app after the agent logs in.</li>
          <li><b>Device data:</b> device model, Android version, app version, permission status and last-seen time.</li>
          <li><b>Location data (optional):</b> approximate last-known location, only if the company has location tracking enabled and the agent grants permission.</li>
        </ul>

        <h2>How we use it</h2>
        <ul>
          <li>To display call activity, statistics and filters in the company dashboard;</li>
          <li>To authenticate agents and keep their sessions secure;</li>
          <li>To provide exports and reports the company requests;</li>
          <li>To keep the service secure and prevent abuse.</li>
        </ul>
        <p>We do not sell personal data, show advertising, or use call data for any unrelated purpose.</p>

        <h2>Who can see it</h2>
        <p>
          Data is isolated per company. Company admins see only their own company&rsquo;s data. The platform
          administrator can access data across companies for support and operations. Agents see only
          their own login screen inside the app — they cannot browse other data.
        </p>

        <h2>Retention &amp; security</h2>
        <p>
          Data is stored in a managed PostgreSQL database with access controls and encrypted
          connections. Passwords are hashed (bcrypt) and session tokens are signed JWTs. Call logs are
          kept until the company or platform administrator removes them.
        </p>

        <h2>Your choices</h2>
        <ul>
          <li>Agents control whether the app can read call logs — Android permission can be revoked at any time.</li>
          <li>Location tracking can be disabled per company in the plan settings.</li>
          <li>Admins can disable agents or disconnect devices instantly from the dashboard.</li>
        </ul>

        <h2>Contact</h2>
        <p>
          Questions about this policy or your data? Email{" "}
          <a href="mailto:privacy@callcrm.app">privacy@callcrm.app</a>.
        </p>
      </div>
    </section>
  );
}
