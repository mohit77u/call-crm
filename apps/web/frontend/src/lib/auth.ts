import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { apiFetch } from "./api";

const SESSION_COOKIE = "crm_session";
const SESSION_REFRESH_COOKIE = "crm_session_refresh";
const PLATFORM_COOKIE = "crm_platform";
const PLATFORM_REFRESH_COOKIE = "crm_platform_refresh";
const AGENT_COOKIE = "crm_agent_session";
const AGENT_REFRESH_COOKIE = "crm_agent_session_refresh";
// Access tokens live 30min (backend ACCESS_TOKEN_TTL); refresh tokens 6 months
// (REFRESH_TOKEN_TTL). Cookies mirror those lifetimes.
const ACCESS_MAX_AGE = 30 * 60;
const REFRESH_MAX_AGE = 180 * 24 * 3600;

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

export type CurrentAgent = {
  id: number;
  name: string;
  username: string;
  companyId: number;
  companyName: string;
  clientCode: string;
  features: CompanyFeatures;
};

const cookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export async function setAdminSession(token: string, refreshToken: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, { ...cookieBase, maxAge: ACCESS_MAX_AGE });
  store.set(SESSION_REFRESH_COOKIE, refreshToken, { ...cookieBase, maxAge: REFRESH_MAX_AGE });
}

export async function clearAdminSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(SESSION_REFRESH_COOKIE);
}

export async function setPlatformSession(token: string, refreshToken: string) {
  const store = await cookies();
  store.set(PLATFORM_COOKIE, token, { ...cookieBase, maxAge: ACCESS_MAX_AGE });
  store.set(PLATFORM_REFRESH_COOKIE, refreshToken, { ...cookieBase, maxAge: REFRESH_MAX_AGE });
}

export async function clearPlatformSession() {
  const store = await cookies();
  store.delete(PLATFORM_COOKIE);
  store.delete(PLATFORM_REFRESH_COOKIE);
}

export async function setAgentSession(token: string, refreshToken: string) {
  const store = await cookies();
  store.set(AGENT_COOKIE, token, { ...cookieBase, maxAge: ACCESS_MAX_AGE });
  store.set(AGENT_REFRESH_COOKIE, refreshToken, { ...cookieBase, maxAge: REFRESH_MAX_AGE });
}

export async function clearAgentSession() {
  const store = await cookies();
  store.delete(AGENT_COOKIE);
  store.delete(AGENT_REFRESH_COOKIE);
}

async function readCookie(name: string) {
  return (await cookies()).get(name)?.value;
}

export const getAdminToken = () => readCookie(SESSION_COOKIE);
export const getPlatformToken = () => readCookie(PLATFORM_COOKIE);
export const getAdminRefreshToken = () => readCookie(SESSION_REFRESH_COOKIE);
export const getPlatformRefreshToken = () => readCookie(PLATFORM_REFRESH_COOKIE);
export const getAgentToken = () => readCookie(AGENT_COOKIE);
export const getAgentRefreshToken = () => readCookie(AGENT_REFRESH_COOKIE);

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

export const getAgent = cache(async (): Promise<CurrentAgent | null> => {
  const token = await getAgentToken();
  if (!token) return null;
  try {
    const { agent } = await apiFetch<{ agent: CurrentAgent }>("/api/auth/agent/me", { token });
    return agent;
  } catch {
    return null;
  }
});

export async function requireAgent() {
  const agent = await getAgent();
  if (!agent) redirect("/agent/login");
  return agent;
}

export function hasFeature(admin: { features?: CompanyFeatures } | null | undefined, key: string) {
  return admin?.features?.[key] === true;
}
