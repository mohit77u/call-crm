import jwt from "jsonwebtoken";
import { config } from "../config";

export type AdminToken = { typ: "admin"; adminId: number; companyId: number };
export type PlatformToken = { typ: "platform"; superadminId: number };
export type AppToken = { typ: "app"; deviceId: number; agentId: number; companyId: number };
export type AgentToken = { typ: "agent"; agentId: number; companyId: number };
export type RefreshToken = { typ: "refresh"; role: "admin" | "platform" | "agent"; userId: number };
export type TokenPayload = AdminToken | PlatformToken | AppToken | AgentToken | RefreshToken;

const secret = () => config.authSecret;

function sign(payload: TokenPayload, expiresIn: jwt.SignOptions["expiresIn"]) {
  return jwt.sign(payload, secret(), { expiresIn });
}

const ttl = (v: string) => v as jwt.SignOptions["expiresIn"];

export const signAdminToken = (p: Omit<AdminToken, "typ">) => sign({ typ: "admin", ...p }, ttl(config.accessTokenTtl));
export const signPlatformToken = (p: Omit<PlatformToken, "typ">) => sign({ typ: "platform", ...p }, ttl(config.accessTokenTtl));
export const signAppToken = (p: Omit<AppToken, "typ">) => sign({ typ: "app", ...p }, "365d");
export const signAgentToken = (p: Omit<AgentToken, "typ">) => sign({ typ: "agent", ...p }, ttl(config.accessTokenTtl));
export const signRefreshToken = (p: Omit<RefreshToken, "typ">) => sign({ typ: "refresh", ...p }, ttl(config.refreshTokenTtl));

export function verifyToken<T extends TokenPayload>(token: string): T | null {
  try {
    return jwt.verify(token, secret()) as T;
  } catch {
    return null;
  }
}
