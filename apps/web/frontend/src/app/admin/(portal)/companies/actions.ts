"use server";

import { redirect } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { getPlatformToken, requireSuperadmin } from "@/lib/auth";
import { FEATURE_DEFS, type FeatureKey } from "@/lib/features";

function back(message: string, isError = true): never {
  redirect(`/admin/companies/new?${isError ? "error" : "notice"}=${encodeURIComponent(message)}`);
}

export async function createCompany(form: FormData) {
  await requireSuperadmin();
  const name = String(form.get("name") ?? "").trim();
  const adminName = String(form.get("adminName") ?? "").trim();
  const adminEmail = String(form.get("adminEmail") ?? "").trim().toLowerCase();
  const adminPassword = String(form.get("adminPassword") ?? "");
  if (!name || !adminName || !adminEmail) back("Company name, admin name and email are required");
  if (adminPassword.length < 8) back("Admin password must be at least 8 characters");

  const features: Record<string, boolean | number | null> = {};
  for (const key of Object.keys(FEATURE_DEFS) as FeatureKey[]) {
    features[key] = form.get(`feature_${key}`) === "on";
  }
  const maxAgentsRaw = String(form.get("maxAgents") ?? "").trim();
  features.maxAgents = maxAgentsRaw === "" ? null : Math.max(0, Math.floor(Number(maxAgentsRaw) || 0));

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
    redirect(`/admin/companies/${res.company.id}?created=1`);
  } catch (e) {
    back(e instanceof ApiError ? e.message : "Could not create company");
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
  features.maxAgents = maxAgentsRaw === "" ? null : Math.max(0, Math.floor(Number(maxAgentsRaw) || 0));

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

export async function deleteCompany(id: number) {
  await requireSuperadmin();
  try {
    await apiFetch(`/api/admin/companies/${id}`, { method: "DELETE", token: await getPlatformToken() });
  } catch (e) {
    redirect(`/admin?error=${encodeURIComponent(e instanceof ApiError ? e.message : "Could not delete company")}`);
  }
  redirect("/admin?notice=Company deleted");
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
