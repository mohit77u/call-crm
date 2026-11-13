"use server";

import { redirect } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { getPlatformToken, requireSuperadmin } from "@/lib/auth";
import { FEATURE_DEFS, type FeatureKey } from "@/lib/features";

export type CompanyFormState = { error?: string; companyId?: number };

export async function createCompany(_prev: CompanyFormState, form: FormData): Promise<CompanyFormState> {
  await requireSuperadmin();
  const name = String(form.get("name") ?? "").trim();
  const adminName = String(form.get("adminName") ?? "").trim();
  const adminEmail = String(form.get("adminEmail") ?? "").trim().toLowerCase();
  const adminPassword = String(form.get("adminPassword") ?? "");

  const features: Record<string, boolean | number | null> = {};
  for (const key of Object.keys(FEATURE_DEFS) as FeatureKey[]) {
    features[key] = form.get(`feature_${key}`) === "on";
  }
  const maxAgentsRaw = String(form.get("maxAgents") ?? "").trim();
  features.maxAgents = maxAgentsRaw === "" ? 150 : Math.min(150, Math.max(0, Math.floor(Number(maxAgentsRaw) || 0)));

  try {
    const res = await apiFetch<{ company: { id: number } }>("/api/admin/companies", {
      body: {
        name,
        adminName,
        adminEmail,
        adminPassword,
        plan: String(form.get("plan") ?? ""),
        features,
      },
      token: await getPlatformToken(),
    });
    return { companyId: res.company.id };
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Could not create company" };
  }
}

export async function updateCompany(id: number, form: FormData) {
  await requireSuperadmin();
  const name = String(form.get("name") ?? "").trim();
  const features: Record<string, boolean | number | null> = {};
  for (const key of Object.keys(FEATURE_DEFS) as FeatureKey[]) {
    features[key] = form.get(`feature_${key}`) === "on";
  }
  const maxAgentsRaw = String(form.get("maxAgents") ?? "").trim();
  features.maxAgents = maxAgentsRaw === "" ? 150 : Math.min(150, Math.max(0, Math.floor(Number(maxAgentsRaw) || 0)));

  try {
    await apiFetch(`/api/admin/companies/${id}`, {
      method: "PATCH",
      body: { name: name || undefined, plan: String(form.get("plan") ?? ""), features },
      token: await getPlatformToken(),
    });
  } catch (e) {
    redirect(`/admin/companies/${id}?error=${encodeURIComponent(e instanceof ApiError ? e.message : "Save failed")}`);
  }
  redirect(`/admin/companies/${id}?notice=Saved`);
}

export async function deleteCompany(id: number): Promise<{ error?: string }> {
  await requireSuperadmin();
  try {
    await apiFetch(`/api/admin/companies/${id}`, { method: "DELETE", token: await getPlatformToken() });
    return {};
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Could not delete company" };
  }
}

export async function regenerateCompanyCode(id: number) {
  await requireSuperadmin();
  try {
    await apiFetch(`/api/admin/companies/${id}/client-code`, { method: "POST", token: await getPlatformToken() });
  } catch {
    redirect(`/admin/companies/${id}?error=Could not regenerate code`);
  }
  redirect(`/admin/companies/${id}?notice=New client code generated`);
}
