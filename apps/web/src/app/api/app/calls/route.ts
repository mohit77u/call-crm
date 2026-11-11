import { query } from "@/lib/db";
import { getAppSession } from "@/lib/auth";
import { CALL_TYPES, deriveStatus, type CallType } from "@/lib/calls";

const MAX_BATCH = 500;

type IncomingCall = { id?: unknown; number?: unknown; name?: unknown; type?: unknown; timestamp?: unknown; durationSec?: unknown; sim?: unknown };

export async function POST(request: Request) {
  const session = await getAppSession(request);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const calls: IncomingCall[] = Array.isArray(body.calls) ? body.calls.slice(0, MAX_BATCH) : [];

  let saved = 0;
  for (const c of calls) {
    const localId = String(c.id ?? "");
    const timestamp = Number(c.timestamp);
    if (!localId || !Number.isFinite(timestamp)) continue;
    const type: CallType = CALL_TYPES.includes(c.type as CallType) ? (c.type as CallType) : "unknown";
    const duration = Math.max(0, Math.floor(Number(c.durationSec) || 0));
    const rows = await query(
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

  await query("UPDATE devices SET last_sync_at = now(), last_seen_at = now() WHERE id = $1", [session.deviceId]);
  return Response.json({ saved });
}
