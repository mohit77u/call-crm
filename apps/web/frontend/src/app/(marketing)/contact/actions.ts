"use server";

import { redirect } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";

export async function submitEnquiry(form: FormData) {
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const company = String(form.get("company") ?? "").trim();
  const plan = String(form.get("plan") ?? "").trim();
  const message = String(form.get("message") ?? "").trim();

  const qs = new URLSearchParams();
  if (plan) qs.set("plan", plan);

  try {
    await apiFetch("/api/contact", {
      body: { name, email, company: company || null, plan: plan || null, message: message || null },
    });
  } catch (e) {
    redirect(`/contact?${qs.toString()}&error=${encodeURIComponent(e instanceof ApiError ? e.message : "Could not send. Please try again.")}`);
  }
  redirect(`/contact?${qs.toString()}&sent=1`);
}
