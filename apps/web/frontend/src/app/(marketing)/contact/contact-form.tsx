"use client";

import { useState, useTransition } from "react";
import { submitEnquiry } from "./actions";
import { PLANS } from "@/lib/plans";
import { notify } from "@/lib/notify";

export function ContactForm({ selectedPlan }: { selectedPlan: string }) {
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);

  return (
    <form
      className="card form"
      onSubmit={(e) => {
        e.preventDefault();
        const formEl = e.currentTarget;
        const fd = new FormData(formEl);
        startTransition(async () => {
          const res = await submitEnquiry(fd);
          if (res.error) notify.error(res.error);
          else {
            setSent(true);
            notify.success("Enquiry sent — we will contact you shortly.");
            formEl.reset();
          }
        });
      }}
    >
      {sent && <div className="notice">Thanks! Your enquiry has been sent — we will contact you shortly.</div>}
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
      <div><button type="submit" disabled={pending}>{pending ? "Sending…" : "Send enquiry"}</button></div>
    </form>
  );
}
