import type { Metadata } from "next";

export const metadata: Metadata = { title: "About — Call CRM" };

export default function AboutPage() {
  return (
    <section className="section" style={{ paddingTop: 48 }}>
      <div className="section-inner prose">
        <h1 className="section-title">About Call CRM</h1>
        <p>
          Call CRM was built for one reason: managers of phone-heavy teams cannot see what happens on
          agents&rsquo; calls. Agents dial customers all day, but without a system there is no record of
          who called whom, whether the call connected, or how long it lasted.
        </p>
        <p>
          We built a deliberately simple product. An Android app on the agent&rsquo;s phone reads the call
          log and syncs it automatically — the agent does not have to do anything except log in once.
          The web dashboard turns those raw logs into per-agent stats, filters and exports that a
          supervisor can actually use.
        </p>
        <h2>What we believe</h2>
        <ul>
          <li><b>Automatic beats manual.</b> If a feature depends on agents remembering to do something, it will not happen. Call sync runs in the background.</li>
          <li><b>Honest data only.</b> We show the call log as Android records it — no inflated metrics, no vanity numbers.</li>
          <li><b>Privacy by design.</b> Call logs sync only after the agent explicitly logs in, and companies can disable location tracking entirely.</li>
          <li><b>Simple pricing.</b> A flat monthly price per plan, no per-seat surprises hiding in the fine print.</li>
        </ul>
        <h2>Who it is for</h2>
        <p>
          Sales floors, telecalling teams, support desks and field-service businesses where every
          conversation matters — and where the company phone bill is only half the story.
        </p>
      </div>
    </section>
  );
}
