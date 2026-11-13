"use server";

import { apiFetch, ApiError } from "@/lib/api";

export type ContactState = { error?: string; sent?: boolean };

export async function submitEnquiry(form: FormData): Promise<ContactState> {
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const company = String(form.get("company") ?? "").trim();
  const plan = String(form.get("plan") ?? "").trim();
  const message = String(form.get("message") ?? "").trim();

  try {
    await apiFetch("/api/contact", {
      body: { name, email, company: company || null, plan: plan || null, message: message || null },
    });
    return { sent: true };
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Could not send. Please try again." };
  }
}
