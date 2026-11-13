import { AppDataSource } from "../../database";
import { checkPassword } from "../../shared/password";
import { signAppToken } from "../../shared/jwt";
import { normalizeClientCode } from "../../shared/clientCode";
import { CALL_TYPES, TIME_ZONE, deriveStatus, type CallType } from "../../shared/calls";
import { hasFeature } from "../../shared/features";
import { notFound, unauthorized } from "../../shared/errors";
import type { AppContext } from "../../middleware/auth";

const MAX_BATCH = 500;

type IncomingCall = {
  id?: unknown;
  number?: unknown;
  name?: unknown;
  type?: unknown;
  timestamp?: unknown;
  durationSec?: unknown;
  sim?: unknown;
};

export async function verifyClient(clientCode: unknown) {
  const rows = await AppDataSource.query("SELECT name FROM companies WHERE client_code = $1", [
    normalizeClientCode(clientCode),
  ]);
  if (rows.length === 0) throw notFound("Invalid client code");
  return { companyName: rows[0].name as string };
}

export async function appLogin(clientCode: unknown, username: string, password: string, device: Record<string, unknown>) {
  const rows = await AppDataSource.query(
    `SELECT a.id, a.name, a.phone, a.company_id, c.name AS company_name, a.password_hash, a.active
     FROM agents a JOIN companies c ON c.id = a.company_id
     WHERE c.client_code = $1 AND a.username = $2`,
    [normalizeClientCode(clientCode), username],
  );
  const agent = rows[0];
  if (!agent || !(await checkPassword(password, agent.password_hash))) {
    throw unauthorized("Invalid client code, username or password");
  }
  if (!agent.active) throw unauthorized("This user is disabled");

  // One active phone per agent — logging in from a new device disconnects the old one.
  await AppDataSource.query("UPDATE devices SET revoked = true WHERE agent_id = $1 AND NOT revoked", [agent.id]);

  const deviceRows = await AppDataSource.query(
    `INSERT INTO devices (company_id, agent_id, model, os_version, app_version, last_seen_at)
     VALUES ($1, $2, $3, $4, $5, now()) RETURNING id`,
    [agent.company_id, agent.id, str(device.model), str(device.osVersion), str(device.appVersion)],
  );
  const token = signAppToken({ deviceId: deviceRows[0].id, agentId: agent.id, companyId: agent.company_id });
  return {
    token,
    agent: { id: agent.id, name: agent.name, phone: agent.phone },
    company: { name: agent.company_name },
    syncFrom: 0,
  };
}

function str(v: unknown) {
  return v == null ? null : String(v).slice(0, 200);
}

export async function uploadCalls(session: AppContext, calls: IncomingCall[]) {
  const batch = Array.isArray(calls) ? calls.slice(0, MAX_BATCH) : [];
  // Only accept calls from today (server timezone) — older history is never stored.
  const [{ cutoff }] = await AppDataSource.query(
    `SELECT (date_trunc('day', now() AT TIME ZONE $1) AT TIME ZONE $1) AS cutoff`,
    [TIME_ZONE],
  );
  const cutoffMs = new Date(cutoff).getTime();
  let saved = 0;
  for (const c of batch) {
    const localId = String(c.id ?? "");
    const timestamp = Number(c.timestamp);
    if (!localId || !Number.isFinite(timestamp) || timestamp < cutoffMs) continue;
    const type: CallType = CALL_TYPES.includes(c.type as CallType) ? (c.type as CallType) : "unknown";
    const duration = Math.max(0, Math.floor(Number(c.durationSec) || 0));
    const rows = await AppDataSource.query(
      `INSERT INTO call_logs (company_id, agent_id, device_id, local_id, phone_number, contact_name, call_type, status, started_at, duration_sec, sim)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, to_timestamp($9 / 1000.0), $10, $11)
       ON CONFLICT (device_id, local_id) DO UPDATE
         SET duration_sec = EXCLUDED.duration_sec, status = EXCLUDED.status, call_type = EXCLUDED.call_type, contact_name = EXCLUDED.contact_name
       RETURNING id`,
      [
        session.companyId,
        session.agentId,
        session.deviceId,
        localId,
        String(c.number ?? "").slice(0, 50),
        c.name ? String(c.name).slice(0, 200) : null,
        type,
        deriveStatus(type, duration),
        timestamp,
        duration,
        c.sim ? String(c.sim).slice(0, 100) : null,
      ],
    );
    saved += rows.length;
  }
  await AppDataSource.query("UPDATE devices SET last_sync_at = now(), last_seen_at = now() WHERE id = $1", [
    session.deviceId,
  ]);
  return { saved };
}

export async function heartbeat(session: AppContext, body: { permissionsOk?: unknown; appVersion?: unknown; location?: unknown }) {
  const loc = body.location as { lat?: unknown; lng?: unknown; accuracy?: unknown; time?: unknown } | null | undefined;
  const lat = loc && Number.isFinite(Number(loc.lat)) ? Number(loc.lat) : null;
  const lng = loc && Number.isFinite(Number(loc.lng)) ? Number(loc.lng) : null;
  const validLocation = lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  const accuracy = loc && Number.isFinite(Number(loc.accuracy)) ? Number(loc.accuracy) : null;
  const locTime = loc && Number.isFinite(Number(loc.time)) ? new Date(Number(loc.time)) : null;
  const trackLocation = hasFeature({ features: session.features }, "locations");

  await AppDataSource.query(
    `UPDATE devices SET last_seen_at = now(), permissions_ok = $2, app_version = COALESCE($3, app_version),
       last_lat = COALESCE($4, last_lat), last_lng = COALESCE($5, last_lng),
       location_at = COALESCE($6, location_at), location_accuracy = COALESCE($7, location_accuracy)
     WHERE id = $1`,
    [
      session.deviceId,
      typeof body.permissionsOk === "boolean" ? body.permissionsOk : null,
      body.appVersion ?? null,
      trackLocation && validLocation ? lat : null,
      trackLocation && validLocation ? lng : null,
      trackLocation && validLocation ? locTime : null,
      trackLocation && validLocation ? accuracy : null,
    ],
  );
  const rows = await AppDataSource.query("SELECT sync_requested_at FROM devices WHERE id = $1", [session.deviceId]);
  return { ok: true, syncRequestedAt: rows[0]?.sync_requested_at ?? null };
}

export async function me(session: AppContext) {
  return { agentName: session.agentName, companyName: session.companyName };
}
