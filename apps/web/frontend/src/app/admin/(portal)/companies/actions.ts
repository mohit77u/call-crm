"use server";

import { apiFetch, ApiError } from "@/lib/api";
import { getPlatformToken, requireSuperadmin } from "@/lib/auth";
import { FEATURE_DEFS, type FeatureKey } from "@/lib/features";

export type CompanyFormState = { error?: string; companyId?: number };

export async function createCompany(_prev: CompanyFormState, form: FormData): Promise<CompanyFormState> {
  await requireSuperadmin();
  const name = String(form.get("name") ?? "").trim();
  let admins: { name: string; email: string; password: string }[] = [];
  try {
    admins = JSON.parse(String(form.get("admins") ?? "[]")) as typeof admins;
  } catch {
    return { error: "Invalid admin data" };
  }
  admins = admins
    .map((a) => ({ name: String(a.name ?? "").trim(), email: String(a.email ?? "").trim().toLowerCase(), password: String(a.password ?? "") }))
    .filter((a) => a.name || a.email || a.password);
  if (admins.length < 1 || admins.length > 3) return { error: "Add between 1 and 3 admins" };

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
        admins,
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

export async function updateCompanyAdmins(
  id: number,
  input: { upserts: { id?: number; name: string; email: string; password?: string }[]; removeIds: number[] },
): Promise<CompanyActionState> {
  await requireSuperadmin();
  try {
    await apiFetch(`/api/admin/companies/${id}/admins`, {
      method: "PATCH",
      body: input,
      token: await getPlatformToken(),
    });
    return { notice: "Admins updated" };
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Could not update admins" };
  }
}

export type CompanyActionState = { error?: string; notice?: string };

export async function updateCompany(id: number, form: FormData): Promise<CompanyActionState> {
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
    return { error: e instanceof ApiError ? e.message : "Save failed" };
  }
  return { notice: "Saved" };
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

export async function regenerateCompanyCode(id: number): Promise<CompanyActionState> {
  await requireSuperadmin();
  try {
    await apiFetch(`/api/admin/companies/${id}/client-code`, { method: "POST", token: await getPlatformToken() });
    return { notice: "New client code generated" };
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Could not regenerate code" };
  }
}
