"use server";

import { redirect } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { getAdminToken, requireAdmin } from "@/lib/auth";

export async function updateCompanyName(form: FormData) {
  await requireAdmin();
  const name = String(form.get("name") ?? "").trim();
  if (!name) redirect("/settings?notice=Saved");
  try {
    await apiFetch("/api/crm/settings/name", { body: { name }, token: await getAdminToken() });
  } catch (e) {
    redirect(`/settings?error=${encodeURIComponent(e instanceof ApiError ? e.message : "Save failed")}`);
  }
  redirect("/settings?notice=Saved");
}

export async function regenerateClientCode() {
  await requireAdmin();
  try {
    await apiFetch("/api/crm/settings/client-code", { method: "POST", token: await getAdminToken() });
  } catch {
    redirect("/settings?error=Could not regenerate code");
  }
  redirect("/settings?notice=New client code generated");
}
