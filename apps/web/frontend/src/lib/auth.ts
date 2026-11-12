import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { apiFetch } from "./api";

const SESSION_COOKIE = "crm_session";
const PLATFORM_COOKIE = "crm_platform";
const SESSION_DAYS = 7;

export type FeatureValue = boolean | number | null;
export type CompanyFeatures = Record<string, FeatureValue>;

export type CurrentAdmin = {
  id: number;
  name: string;
  email: string;
  companyId: number;
  companyName: string;
  clientCode: string;
  features: CompanyFeatures;
};

export type CurrentSuperadmin = { id: number; name: string; email: string };

const cookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_DAYS * 24 * 3600,
};

export async function setAdminSession(token: string) {
  (await cookies()).set(SESSION_COOKIE, token, cookieBase);
}

export async function clearAdminSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function setPlatformSession(token: string) {
  (await cookies()).set(PLATFORM_COOKIE, token, cookieBase);
}

export async function clearPlatformSession() {
  (await cookies()).delete(PLATFORM_COOKIE);
}

async function readCookie(name: string) {
  return (await cookies()).get(name)?.value;
}

export const getAdminToken = () => readCookie(SESSION_COOKIE);
export const getPlatformToken = () => readCookie(PLATFORM_COOKIE);

export const getAdmin = cache(async (): Promise<CurrentAdmin | null> => {
  const token = await getAdminToken();
  if (!token) return null;
  try {
    const { admin } = await apiFetch<{ admin: CurrentAdmin }>("/api/auth/admin/me", { token });
    return admin;
  } catch {
    return null;
  }
});

export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect("/company/login");
  return admin;
}

export const getSuperadmin = cache(async (): Promise<CurrentSuperadmin | null> => {
  const token = await getPlatformToken();
  if (!token) return null;
  try {
    const { superadmin } = await apiFetch<{ superadmin: CurrentSuperadmin }>("/api/auth/platform/me", { token });
    return superadmin;
  } catch {
    return null;
  }
});

export async function requireSuperadmin() {
  const admin = await getSuperadmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

export function hasFeature(admin: { features?: CompanyFeatures } | null | undefined, key: string) {
  return admin?.features?.[key] === true;
}
