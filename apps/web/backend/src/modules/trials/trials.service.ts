import { AppDataSource, returnedRows } from "../../database";
import { badRequest, notFound } from "../../shared/errors";
import type { AdminContext, AgentContext } from "../../middleware/auth";

const COLS = `id, name, phone, days,
  created_at AS "createdAt", updated_at AS "updatedAt",
  (created_at::date + days) AS "activeUntil",
  CASE WHEN (created_at::date + days) >= CURRENT_DATE THEN 'active' ELSE 'expired' END AS status`;

function phone10(v: unknown): string {
  const d = String(v ?? "").replace(/\D/g, "");
  return d.length >= 10 ? d.slice(-10) : "";
}

export async function agentListTrials(agent: AgentContext) {
  return AppDataSource.query(
    `SELECT ${COLS} FROM free_trials
     WHERE agent_id = $1 AND company_id = $2 AND deleted_at IS NULL
     ORDER BY created_at DESC, id DESC LIMIT 500`,
    [agent.agentId, agent.companyId],
  );
}

export async function adminListTrials(
  admin: AdminContext,
  filters: { agent?: string; status?: string; q?: string },
) {
  const where = ["t.company_id = $1", "t.deleted_at IS NULL", "a.deleted_at IS NULL"];
  const params: unknown[] = [admin.companyId];
  if (filters.agent === "all") {
    // no-op
  } else if (filters.agent && /^\d+$/.test(filters.agent)) {
    params.push(Number(filters.agent));
    where.push(`t.agent_id = $${params.length}`);
  }
  if (filters.status === "active") {
    where.push("(t.created_at::date + t.days) >= CURRENT_DATE");
  } else if (filters.status === "expired") {
    where.push("(t.created_at::date + t.days) < CURRENT_DATE");
  }
  if (filters.q) {
    params.push(`%${filters.q}%`);
    where.push(`(t.name ILIKE $${params.length} OR t.phone ILIKE $${params.length} OR a.name ILIKE $${params.length})`);
  }
  return AppDataSource.query(
    `SELECT t.id, t.name, t.phone, t.days, t.agent_id AS "agentId", a.name AS "agentName",
       t.created_at AS "createdAt", t.updated_at AS "updatedAt",
       (t.created_at::date + t.days) AS "activeUntil",
       CASE WHEN (t.created_at::date + t.days) >= CURRENT_DATE THEN 'active' ELSE 'expired' END AS status
     FROM free_trials t JOIN agents a ON a.id = t.agent_id
     WHERE ${where.join(" AND ")}
     ORDER BY t.created_at DESC, t.id DESC LIMIT 1000`,
    params,
  );
}

export async function agentCreateTrial(agent: AgentContext, input: { name: string; phone: string; days: number }) {
  const name = input.name.trim();
  if (!name) throw badRequest("Name is required");
  const phone = phone10(input.phone);
  if (!phone) throw badRequest("Enter a valid phone number");
  const days = Math.floor(Number(input.days));
  if (!Number.isInteger(days) || days < 1 || days > 7) throw badRequest("Days must be between 1 and 7");
  const rows = await AppDataSource.query(
    `INSERT INTO free_trials (company_id, agent_id, name, phone, days)
     VALUES ($1, $2, $3, $4, $5) RETURNING ${COLS}`,
    [agent.companyId, agent.agentId, name, phone, days],
  );
  return rows[0];
}

export async function agentUpdateTrial(agent: AgentContext, id: number, patch: Record<string, unknown>) {
  const rows = await AppDataSource.query(
    "SELECT id FROM free_trials WHERE id = $1 AND agent_id = $2 AND company_id = $3 AND deleted_at IS NULL",
    [id, agent.agentId, agent.companyId],
  );
  if (!rows[0]) throw notFound("Trial not found");

  const sets: string[] = [];
  const params: unknown[] = [id, agent.agentId, agent.companyId];
  const push = (col: string, val: unknown) => {
    params.push(val);
    sets.push(`${col} = $${params.length}`);
  };

  if ("name" in patch) {
    const name = String(patch.name ?? "").trim().slice(0, 200);
    if (!name) throw badRequest("Name is required");
    push("name", name);
  }
  if ("phone" in patch) {
    const phone = phone10(patch.phone);
    if (!phone) throw badRequest("Enter a valid phone number");
    push("phone", phone);
  }
  if ("days" in patch) {
    const days = Math.floor(Number(patch.days));
    if (!Number.isInteger(days) || days < 1 || days > 7) throw badRequest("Days must be between 1 and 7");
    push("days", days);
  }

  if (sets.length === 0) throw badRequest("Nothing to update");
  sets.push("updated_at = now()");
  const updated = await AppDataSource.query(
    `UPDATE free_trials SET ${sets.join(", ")}
     WHERE id = $1 AND agent_id = $2 AND company_id = $3 AND deleted_at IS NULL RETURNING ${COLS}`,
    params,
  );
  return returnedRows(updated)[0];
}

export async function agentDeleteTrial(agent: AgentContext, id: number) {
  const rows = await AppDataSource.query(
    "UPDATE free_trials SET deleted_at = now(), updated_at = now() WHERE id = $1 AND agent_id = $2 AND company_id = $3 AND deleted_at IS NULL RETURNING id",
    [id, agent.agentId, agent.companyId],
  );
  if (!rows[0]) throw notFound("Trial not found");
  return { deleted: true };
}
