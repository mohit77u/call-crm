import { queryOne } from "@/lib/db";
import { normalizeClientCode } from "@/lib/clientCode";
import { checkPassword } from "@/lib/password";
import { signAppToken } from "@/lib/auth";

type AgentRow = { id: number; name: string; company_id: number; company_name: string; password_hash: string; active: boolean };

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const username = String(body.username ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const agent = await queryOne<AgentRow>(
    `SELECT a.id, a.name, a.company_id, c.name AS company_name, a.password_hash, a.active
     FROM agents a JOIN companies c ON c.id = a.company_id
     WHERE c.client_code = $1 AND a.username = $2`,
    [normalizeClientCode(body.clientCode), username],
  );
  if (!agent || !(await checkPassword(password, agent.password_hash))) {
    return Response.json({ error: "Invalid client code, username or password" }, { status: 401 });
  }
  if (!agent.active) return Response.json({ error: "This user is disabled" }, { status: 403 });

  const device = body.device ?? {};
  const row = await queryOne<{ id: number }>(
    `INSERT INTO devices (company_id, agent_id, model, os_version, app_version, last_seen_at)
     VALUES ($1, $2, $3, $4, $5, now()) RETURNING id`,
    [agent.company_id, agent.id, str(device.model), str(device.osVersion), str(device.appVersion)],
  );
  const token = await signAppToken({ deviceId: row!.id, agentId: agent.id, companyId: agent.company_id });
  return Response.json({
    token,
    agent: { id: agent.id, name: agent.name },
    company: { name: agent.company_name },
    syncFrom: Date.now(),
  });
}

function str(v: unknown) {
  return v == null ? null : String(v).slice(0, 200);
}
