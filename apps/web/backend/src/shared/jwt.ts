import jwt from "jsonwebtoken";
import { config } from "../config";

export type AdminToken = { typ: "admin"; adminId: number; companyId: number };
export type PlatformToken = { typ: "platform"; superadminId: number };
export type AppToken = { typ: "app"; deviceId: number; agentId: number; companyId: number };
export type TokenPayload = AdminToken | PlatformToken | AppToken;

const secret = () => config.authSecret;

function sign(payload: TokenPayload, expiresIn: jwt.SignOptions["expiresIn"]) {
  return jwt.sign(payload, secret(), { expiresIn });
}

export const signAdminToken = (p: Omit<AdminToken, "typ">) => sign({ typ: "admin", ...p }, "7d");
export const signPlatformToken = (p: Omit<PlatformToken, "typ">) => sign({ typ: "platform", ...p }, "7d");
export const signAppToken = (p: Omit<AppToken, "typ">) => sign({ typ: "app", ...p }, "365d");

export function verifyToken<T extends TokenPayload>(token: string): T | null {
  try {
    return jwt.verify(token, secret()) as T;
  } catch {
    return null;
  }
}
