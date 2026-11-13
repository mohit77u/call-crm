"use server";

import { apiFetch, ApiError } from "@/lib/api";
import { getAdminToken, requireAdmin } from "@/lib/auth";

export type SettingsActionState = { error?: string; notice?: string };

function fail(e: unknown, fallback: string): SettingsActionState {
  return { error: e instanceof ApiError ? e.message : fallback };
}

export async function updateCompanyName(form: FormData): Promise<SettingsActionState> {
  await requireAdmin();
  const name = String(form.get("name") ?? "").trim();
  if (!name) return { error: "Company name is required" };
  try {
    await apiFetch("/api/crm/settings/name", { body: { name }, token: await getAdminToken() });
    return { notice: "Saved" };
  } catch (e) {
    return fail(e, "Save failed");
  }
}

export async function regenerateClientCode(): Promise<SettingsActionState> {
  await requireAdmin();
  try {
    await apiFetch("/api/crm/settings/client-code", { method: "POST", token: await getAdminToken() });
    return { notice: "New client code generated" };
  } catch (e) {
    return fail(e, "Could not regenerate code");
  }
}
