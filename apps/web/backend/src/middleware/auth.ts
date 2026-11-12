import type { NextFunction, Request, Response } from "express";
import { AppDataSource } from "../database";
import { verifyToken, type AdminToken, type AppToken, type PlatformToken } from "../shared/jwt";
import { asyncHandler, forbidden, unauthorized } from "../shared/errors";
import { hasFeature, type FeatureKey } from "../shared/features";

export type AdminContext = {
  adminId: number;
  name: string;
  email: string;
  companyId: number;
  companyName: string;
  clientCode: string;
  features: Record<string, unknown>;
};

export type PlatformContext = { superadminId: number; name: string; email: string };

export type AppContext = {
  deviceId: number;
  agentId: number;
  agentName: string;
  companyId: number;
  companyName: string;
  clientCode: string;
  features: Record<string, unknown>;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: AdminContext;
      platform?: PlatformContext;
      appSession?: AppContext;
    }
  }
}

function bearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  return header?.startsWith("Bearer ") ? header.slice(7) : null;
}

export const requireAdmin = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const payload = bearerToken(req) ? verifyToken<AdminToken>(bearerToken(req)!) : null;
  if (!payload || payload.typ !== "admin") throw unauthorized();
  const rows = await AppDataSource.query(
    `SELECT a.id AS admin_id, a.name, a.email,
            c.id AS company_id, c.name AS company_name, c.client_code, c.features
     FROM admins a JOIN companies c ON c.id = a.company_id
     WHERE a.id = $1 AND a.company_id = $2`,
    [payload.adminId, payload.companyId],
  );
  const row = rows[0];
  if (!row) throw unauthorized();
  req.admin = {
    adminId: row.admin_id,
    name: row.name,
    email: row.email,
    companyId: row.company_id,
    companyName: row.company_name,
    clientCode: row.client_code,
    features: row.features ?? {},
  };
  next();
});

export const requireSuperadmin = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const payload = bearerToken(req) ? verifyToken<PlatformToken>(bearerToken(req)!) : null;
  if (!payload || payload.typ !== "platform") throw unauthorized();
  const rows = await AppDataSource.query("SELECT id, name, email FROM superadmins WHERE id = $1", [payload.superadminId]);
  const row = rows[0];
  if (!row) throw unauthorized();
  req.platform = { superadminId: row.id, name: row.name, email: row.email };
  next();
});

export const requireAppDevice = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const payload = bearerToken(req) ? verifyToken<AppToken>(bearerToken(req)!) : null;
  if (!payload || payload.typ !== "app") throw unauthorized();
  const rows = await AppDataSource.query(
    `SELECT d.id AS device_id, d.agent_id, a.name AS agent_name,
            c.id AS company_id, c.name AS company_name, c.client_code, c.features
     FROM devices d
     JOIN agents a ON a.id = d.agent_id
     JOIN companies c ON c.id = d.company_id
     WHERE d.id = $1 AND d.agent_id = $2 AND d.company_id = $3 AND NOT d.revoked AND a.active`,
    [payload.deviceId, payload.agentId, payload.companyId],
  );
  const row = rows[0];
  if (!row) throw unauthorized();
  req.appSession = {
    deviceId: row.device_id,
    agentId: row.agent_id,
    agentName: row.agent_name,
    companyId: row.company_id,
    companyName: row.company_name,
    clientCode: row.client_code,
    features: row.features ?? {},
  };
  next();
});

// Gate an endpoint behind a per-company feature flag.
// Works for both CRM admin sessions and mobile app sessions.
export function requireFeature(key: FeatureKey) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const features = req.admin?.features ?? req.appSession?.features;
    if (!hasFeature({ features }, key)) {
      return next(forbidden(`Feature '${key}' is not enabled for this company`));
    }
    next();
  };
}
