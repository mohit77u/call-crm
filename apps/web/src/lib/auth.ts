import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { queryOne } from "./db";

const SESSION_COOKIE = "crm_session";
const SESSION_DAYS = 7;

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value && process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(value ?? "dev-only-secret-change-me");
}

type AdminSession = { typ: "admin"; adminId: number; companyId: number };
export type AppSession = { typ: "app"; deviceId: number; agentId: number; companyId: number };

async function sign(payload: AdminSession | AppSession, expiresIn: string) {
  return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(expiresIn).sign(secret());
}

async function verify<T>(token: string | undefined, typ: string): Promise<T | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.typ === typ ? (payload as T) : null;
  } catch {
    return null;
  }
}

export async function startAdminSession(adminId: number, companyId: number) {
  const token = await sign({ typ: "admin", adminId, companyId }, `${SESSION_DAYS}d`);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 3600,
  });
}

export async function endAdminSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export type CurrentAdmin = { id: number; name: string; email: string; companyId: number; companyName: string; clientCode: string };

export async function getAdmin(): Promise<CurrentAdmin | null> {
  const session = await verify<AdminSession>((await cookies()).get(SESSION_COOKIE)?.value, "admin");
  if (!session) return null;
  return queryOne<CurrentAdmin>(
    `SELECT a.id, a.name, a.email, c.id AS "companyId", c.name AS "companyName", c.client_code AS "clientCode"
     FROM admins a JOIN companies c ON c.id = a.company_id
     WHERE a.id = $1 AND a.company_id = $2`,
    [session.adminId, session.companyId],
  );
}

export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect("/login");
  return admin;
}

export function signAppToken(session: Omit<AppSession, "typ">) {
  return sign({ typ: "app", ...session }, "365d");
}

export async function getAppSession(request: Request): Promise<AppSession | null> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : undefined;
  const session = await verify<AppSession>(token, "app");
  if (!session) return null;
  const ok = await queryOne(
    `SELECT 1 FROM devices d JOIN agents a ON a.id = d.agent_id
     WHERE d.id = $1 AND d.agent_id = $2 AND d.company_id = $3 AND NOT d.revoked AND a.active`,
    [session.deviceId, session.agentId, session.companyId],
  );
  return ok ? session : null;
}
