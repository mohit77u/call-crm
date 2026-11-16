import { AppDataSource, returnedRows } from "../../database";
import { badRequest, notFound } from "../../shared/errors";
import { isLeadStatus } from "../../shared/leads";
import { notifyAdmins, notifyAgents } from "../notifications/notifications.service";
import type { AdminContext, AgentContext } from "../../middleware/auth";

const COLS = `id, company_id AS "companyId", assigned_agent_id AS "assignedAgentId",
  requested_by_agent_id AS "requestedByAgentId", created_by_type AS "createdByType",
  created_by_id AS "createdById", source, name, phone, email, notes, status,
  account_created AS "accountCreated", request_status AS "requestStatus",
  assigned_at AS "assignedAt", last_contacted_at AS "lastContactedAt",
  created_at AS "createdAt", updated_at AS "updatedAt"`;

const COLS_L = `l.id, l.company_id AS "companyId", l.assigned_agent_id AS "assignedAgentId",
  l.requested_by_agent_id AS "requestedByAgentId", l.created_by_type AS "createdByType",
  l.created_by_id AS "createdById", l.source, l.name, l.phone, l.email, l.notes, l.status,
  l.account_created AS "accountCreated", l.request_status AS "requestStatus",
  l.assigned_at AS "assignedAt", l.last_contacted_at AS "lastContactedAt",
  l.created_at AS "createdAt", l.updated_at AS "updatedAt"`;

function str(v: unknown, max = 500) {
  return v == null ? null : String(v).slice(0, max);
}

// Phone is stored as exactly 10 digits: non-digits are stripped and the last
// 10 digits are kept (handles +91/0 prefixes and formatting). Fewer than 10
// digits -> null.
function normalizePhone(v: unknown): string | null {
  if (v == null) return null;
  const d = String(v).replace(/\D/g, "");
  return d.length >= 10 ? d.slice(-10) : null;
}

function withNormalizedPhones<T extends { phone?: unknown }>(rows: T[]): T[] {
  return rows.map((r) => ({ ...r, phone: normalizePhone(r.phone) }));
}

async function assertAgentInCompany(companyId: number, agentId: number) {
  const rows = await AppDataSource.query(
    "SELECT id FROM agents WHERE id = $1 AND company_id = $2 AND active AND deleted_at IS NULL",
    [agentId, companyId],
  );
  if (!rows[0]) throw badRequest("Agent not found or inactive");
}

async function assertPhoneAvailable(companyId: number, phone: string | null, excludeId?: number) {
  if (!phone) return;
  const rows = await AppDataSource.query(
    "SELECT id FROM leads WHERE company_id = $1 AND phone = $2 AND deleted_at IS NULL AND ($3::int IS NULL OR id <> $3) LIMIT 1",
    [companyId, phone, excludeId ?? null],
  );
  if (rows[0]) throw badRequest("A lead with this phone number already exists");
}

// ---------- Agent side ----------

export async function agentListLeads(agent: AgentContext) {
  const rows = await AppDataSource.query(
    `SELECT ${COLS} FROM leads
     WHERE company_id = $1 AND assigned_agent_id = $2 AND deleted_at IS NULL
     ORDER BY created_at DESC, id DESC LIMIT 500`,
    [agent.companyId, agent.agentId],
  );
  return withNormalizedPhones(rows);
}

// Agent lead request is just a notification to company admins — the admin
// decides how many leads to assign and to whom.
export async function agentRequestLeads(agent: AgentContext) {
  await notifyAdmins(agent.companyId, "lead_request", `${agent.name} has requested leads`, "/company/leads");
  return { requested: true };
}

export async function agentMyRequests(agent: AgentContext) {
  const rows = await AppDataSource.query(
    `SELECT ${COLS} FROM leads
     WHERE company_id = $1 AND requested_by_agent_id = $2 AND request_status IS NOT NULL AND deleted_at IS NULL
     ORDER BY created_at DESC LIMIT 100`,
    [agent.companyId, agent.agentId],
  );
  return withNormalizedPhones(rows);
}

// ---------- Admin (company) side ----------

export async function agentUpdateLead(agent: AgentContext, id: number, patch: Record<string, unknown>) {
  const rows = await AppDataSource.query(
    `SELECT id FROM leads WHERE id = $1 AND company_id = $2 AND assigned_agent_id = $3 AND deleted_at IS NULL`,
    [id, agent.companyId, agent.agentId],
  );
  if (!rows[0]) throw notFound("Lead not found");

  const sets: string[] = [];
  const params: unknown[] = [id, agent.companyId, agent.agentId];
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
    const phone = normalizePhone(patch.phone);
    await assertPhoneAvailable(agent.companyId, phone, id);
    push("phone", phone);
  }
  if ("email" in patch) push("email", str(patch.email, 200));
  if ("notes" in patch) push("notes", str(patch.notes));
  if ("status" in patch) {
    if (!isLeadStatus(patch.status)) throw badRequest("Invalid status");
    push("status", patch.status);
  }
  if ("accountCreated" in patch || "account_created" in patch) {
    const v = patch.accountCreated ?? patch.account_created;
    push("account_created", v === true);
  }

  if (sets.length === 0) throw badRequest("Nothing to update");
  sets.push("updated_at = now()");
  const updated = await AppDataSource.query(
    `UPDATE leads SET ${sets.join(", ")} WHERE id = $1 AND company_id = $2 AND assigned_agent_id = $3 AND deleted_at IS NULL RETURNING ${COLS}`,
    params,
  );
  return returnedRows(updated)[0];
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function pushDateFilters(where: string[], params: unknown[], filters: { createdFrom?: string; createdTo?: string }) {
  if (filters.createdFrom && DATE_RE.test(filters.createdFrom)) {
    params.push(filters.createdFrom);
    where.push(`l.created_at >= $${params.length}::date`);
  }
  if (filters.createdTo && DATE_RE.test(filters.createdTo)) {
    params.push(filters.createdTo);
    where.push(`l.created_at < ($${params.length}::date + interval '1 day')`);
  }
}

export async function adminListLeads(
  admin: AdminContext,
  filters: { agent?: string; status?: string; q?: string; accountCreated?: string; createdFrom?: string; createdTo?: string },
  page: number,
  perPage: number,
) {
  const where = ["l.company_id = $1", "l.deleted_at IS NULL", "(l.request_status IS NULL OR l.request_status = 'approved')"];
  const params: unknown[] = [admin.companyId];
  if (filters.agent === "unassigned") {
    where.push("l.assigned_agent_id IS NULL");
  } else if (filters.agent && /^\d+$/.test(filters.agent)) {
    params.push(Number(filters.agent));
    where.push(`l.assigned_agent_id = $${params.length}`);
  }
  if (filters.status && isLeadStatus(filters.status)) {
    params.push(filters.status);
    where.push(`l.status = $${params.length}`);
  }
  if (filters.accountCreated === "yes") {
    where.push("l.account_created");
  } else if (filters.accountCreated === "no") {
    where.push("NOT l.account_created");
  }
  if (filters.q) {
    params.push(`%${filters.q}%`);
    where.push(`(l.name ILIKE $${params.length} OR l.phone ILIKE $${params.length} OR l.email ILIKE $${params.length} OR l.notes ILIKE $${params.length})`);
  }
  pushDateFilters(where, params, filters);
  const whereSql = where.join(" AND ");
  const totalRows = await AppDataSource.query(
    `SELECT count(*)::int AS n FROM leads l WHERE ${whereSql}`,
    params,
  );
  const total = totalRows[0]?.n ?? 0;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(page, pages);
  const limitIdx = params.length + 1;
  const offsetIdx = params.length + 2;
  params.push(perPage, (safePage - 1) * perPage);
  const leads = withNormalizedPhones(
    await AppDataSource.query(
      `SELECT ${COLS_L}, a.name AS "agentName"
       FROM leads l LEFT JOIN agents a ON a.id = l.assigned_agent_id
       WHERE ${whereSql}
       ORDER BY l.created_at DESC, l.id DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params,
    ),
  );
  return { leads, total, page: safePage, pages, perPage };
}

export async function adminCreateLead(
  admin: AdminContext,
  input: { name: string; phone?: string | null; email?: string | null; notes?: string | null; status?: string; assignedAgentId?: number | null },
) {
  const name = input.name.trim();
  if (!name) throw badRequest("Name is required");
  if (input.status && !isLeadStatus(input.status)) throw badRequest("Invalid status");
  if (input.assignedAgentId) await assertAgentInCompany(admin.companyId, input.assignedAgentId);
  const phone = normalizePhone(input.phone);
  if (!phone) throw badRequest("Enter a valid phone number");
  await assertPhoneAvailable(admin.companyId, phone);
  const rows = await AppDataSource.query(
    `INSERT INTO leads (company_id, assigned_agent_id, requested_by_agent_id, created_by_type, created_by_id, source, name, phone, email, notes, status, request_status, assigned_at)
     VALUES ($1, $2, NULL, 'admin', $3, 'manual', $4, $5, $6, $7, $8, NULL, CASE WHEN $2::int IS NULL THEN NULL ELSE now() END)
     RETURNING ${COLS}`,
    [
      admin.companyId,
      input.assignedAgentId ?? null,
      admin.adminId,
      name,
      phone,
      str(input.email, 200),
      str(input.notes),
      input.status && isLeadStatus(input.status) ? input.status : "new",
    ],
  );
  if (input.assignedAgentId) {
    await notifyAgents(admin.companyId, [input.assignedAgentId], "leads_assigned", "1 new lead assigned to you", "/agent/leads");
  }
  return rows[0];
}

export async function adminUpdateLead(admin: AdminContext, id: number, patch: Record<string, unknown>) {
  const rows = await AppDataSource.query(
    `SELECT id, assigned_agent_id AS "assignedAgentId" FROM leads WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
    [id, admin.companyId],
  );
  if (!rows[0]) throw notFound("Lead not found");
  const previousAgentId = rows[0].assignedAgentId as number | null;
  let newlyAssignedAgentId: number | null = null;

  const sets: string[] = [];
  const params: unknown[] = [id, admin.companyId];
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
    const phone = normalizePhone(patch.phone);
    if (!phone) throw badRequest("Enter a valid phone number");
    await assertPhoneAvailable(admin.companyId, phone, id);
    push("phone", phone);
  }
  if ("email" in patch) push("email", str(patch.email, 200));
  if ("notes" in patch) push("notes", str(patch.notes));
  if ("status" in patch) {
    if (!isLeadStatus(patch.status)) throw badRequest("Invalid status");
    push("status", patch.status);
  }
  if ("accountCreated" in patch || "account_created" in patch) {
    const v = patch.accountCreated ?? patch.account_created;
    push("account_created", v === true);
  }
  if ("assignedAgentId" in patch || "assigned_agent_id" in patch) {
    const raw = patch.assignedAgentId ?? patch.assigned_agent_id;
    const agentId = raw == null || raw === "" ? null : Number(raw);
    if (agentId != null) {
      if (!Number.isInteger(agentId)) throw badRequest("Invalid agent");
      await assertAgentInCompany(admin.companyId, agentId);
      if (agentId !== previousAgentId) newlyAssignedAgentId = agentId;
    }
    push("assigned_agent_id", agentId);
    params.push(agentId);
    sets.push(`assigned_at = CASE WHEN $${params.length}::int IS NULL THEN assigned_at ELSE now() END`);
  }

  if (sets.length === 0) throw badRequest("Nothing to update");
  sets.push("updated_at = now()");
  const updated = await AppDataSource.query(
    `UPDATE leads SET ${sets.join(", ")} WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL RETURNING ${COLS}`,
    params,
  );
  if (newlyAssignedAgentId) {
    await notifyAgents(admin.companyId, [newlyAssignedAgentId], "leads_assigned", "1 new lead assigned to you", "/agent/leads");
  }
  return returnedRows(updated)[0];
}

export async function adminDeleteLead(admin: AdminContext, id: number) {
  const rows = await AppDataSource.query(
    "UPDATE leads SET deleted_at = now(), updated_at = now() WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL RETURNING id",
    [id, admin.companyId],
  );
  if (!rows[0]) throw notFound("Lead not found");
  return { deleted: true };
}

// Assigns leads to an agent. When `leadIds` is given, exactly those leads are
// assigned; otherwise up to `count` random unassigned leads are assigned (all
// available ones when fewer remain).
export async function adminAssignLeads(admin: AdminContext, agentId: number, count: number, leadIds?: number[]) {
  await assertAgentInCompany(admin.companyId, agentId);
  if (leadIds && leadIds.length > 0) {
    const rows = returnedRows<{ id: number }>(
      await AppDataSource.query(
        `UPDATE leads
         SET assigned_agent_id = $3, assigned_at = now(), updated_at = now()
         WHERE company_id = $1 AND id = ANY($2::int[]) AND deleted_at IS NULL
         RETURNING id`,
        [admin.companyId, leadIds, agentId],
      ),
    );
    if (rows.length > 0) {
      await notifyAgents(admin.companyId, [agentId], "leads_assigned", `${rows.length} new lead${rows.length === 1 ? "" : "s"} assigned to you`, "/agent/leads");
    }
    return { assigned: rows.length, requested: leadIds.length };
  }
  const rows = returnedRows<{ id: number }>(
    await AppDataSource.query(
      `UPDATE leads
       SET assigned_agent_id = $3, assigned_at = now(), updated_at = now()
       WHERE id IN (
         SELECT id FROM leads
         WHERE company_id = $1 AND assigned_agent_id IS NULL AND deleted_at IS NULL
           AND (request_status IS NULL OR request_status = 'approved')
         ORDER BY random()
         LIMIT $2
       )
       RETURNING id`,
      [admin.companyId, count, agentId],
    ),
  );
  if (rows.length > 0) {
    await notifyAgents(admin.companyId, [agentId], "leads_assigned", `${rows.length} new lead${rows.length === 1 ? "" : "s"} assigned to you`, "/agent/leads");
  }
  return { assigned: rows.length, requested: count };
}

export async function adminListRequests(admin: AdminContext) {
  const rows = await AppDataSource.query(
    `SELECT ${COLS_L}, a.name AS "agentName"
     FROM leads l LEFT JOIN agents a ON a.id = l.requested_by_agent_id
     WHERE l.company_id = $1 AND l.request_status = 'pending' AND l.deleted_at IS NULL
     ORDER BY l.created_at ASC`,
    [admin.companyId],
  );
  return withNormalizedPhones(rows);
}

export async function adminApproveRequest(admin: AdminContext, id: number, agentId: number) {
  await assertAgentInCompany(admin.companyId, agentId);
  const rows = returnedRows(
    await AppDataSource.query(
      `UPDATE leads SET request_status = 'approved', assigned_agent_id = $3, assigned_at = now(), status = 'new', updated_at = now()
       WHERE id = $1 AND company_id = $2 AND request_status = 'pending' AND deleted_at IS NULL RETURNING ${COLS}`,
      [id, admin.companyId, agentId],
    ),
  );
  if (rows.length === 0) throw notFound("Pending request not found");
  await notifyAgents(admin.companyId, [agentId], "leads_assigned", "1 new lead assigned to you", "/agent/leads");
  return rows[0];
}

export async function adminExportLeadsRows(admin: AdminContext, filters: { agent?: string; status?: string; q?: string; accountCreated?: string; createdFrom?: string; createdTo?: string }) {
  const where = ["l.company_id = $1", "l.deleted_at IS NULL", "(l.request_status IS NULL OR l.request_status = 'approved')"];
  const params: unknown[] = [admin.companyId];
  if (filters.agent === "unassigned") {
    where.push("l.assigned_agent_id IS NULL");
  } else if (filters.agent && /^\d+$/.test(filters.agent)) {
    params.push(Number(filters.agent));
    where.push(`l.assigned_agent_id = $${params.length}`);
  }
  if (filters.status && isLeadStatus(filters.status)) {
    params.push(filters.status);
    where.push(`l.status = $${params.length}`);
  }
  if (filters.accountCreated === "yes") {
    where.push("l.account_created");
  } else if (filters.accountCreated === "no") {
    where.push("NOT l.account_created");
  }
  if (filters.q) {
    params.push(`%${filters.q}%`);
    where.push(`(l.name ILIKE $${params.length} OR l.phone ILIKE $${params.length} OR l.email ILIKE $${params.length} OR l.notes ILIKE $${params.length})`);
  }
  pushDateFilters(where, params, filters);
  const rows = await AppDataSource.query(
    `SELECT l.name, l.phone, l.email, COALESCE(a.name, '') AS agent, l.status,
            l.account_created AS "accountCreated", COALESCE(l.notes, '') AS notes,
            l.created_at AS "createdAt", l.updated_at AS "updatedAt"
     FROM leads l LEFT JOIN agents a ON a.id = l.assigned_agent_id
     WHERE ${where.join(" AND ")}
     ORDER BY l.created_at DESC, l.id DESC
     LIMIT 10000`,
    params,
  );
  return withNormalizedPhones(rows);
}

const MAX_IMPORT_ROWS = 5000;

export async function adminImportLeads(
  admin: AdminContext,
  input: {
    rows: unknown;
    mapping: { name?: number; phone?: number; email?: number; notes?: number };
    assignment: { mode: "none" | "agent" | "roundrobin" | "random"; agentId?: number | null };
  },
) {
  const raw = Array.isArray(input.rows) ? input.rows.slice(0, MAX_IMPORT_ROWS) : [];
  const m = input.mapping ?? {};
  const phoneIdx = typeof m.phone === "number" ? m.phone : -1;
  if (phoneIdx < 0) throw badRequest("Map the Phone column");
  const nameIdx = typeof m.name === "number" ? m.name : -1;
  const cell = (row: unknown[], idx: number | undefined, max = 2000) =>
    typeof idx === "number" && idx >= 0 ? str((row as unknown[])[idx], max) || null : null;

  let assignAgentId: number | null = null;
  let roundRobin: number[] = [];
  if (input.assignment?.mode === "agent" && input.assignment.agentId) {
    await assertAgentInCompany(admin.companyId, input.assignment.agentId);
    assignAgentId = input.assignment.agentId;
  } else if (input.assignment?.mode === "roundrobin" || input.assignment?.mode === "random") {
    const agents = await AppDataSource.query(
      "SELECT id FROM agents WHERE company_id = $1 AND active AND deleted_at IS NULL ORDER BY id",
      [admin.companyId],
    );
    roundRobin = agents.map((a: { id: number }) => a.id);
    if (roundRobin.length === 0) throw badRequest("No active agents to assign");
  }

  const existingPhones = new Set(
    (
      await AppDataSource.query(
        "SELECT phone FROM leads WHERE company_id = $1 AND phone IS NOT NULL AND phone <> '' AND deleted_at IS NULL",
        [admin.companyId],
      )
    ).map((r: { phone: string }) => r.phone),
  );
  const seenPhones = new Set<string>();

  let imported = 0;
  let skipped = 0;
  let rr = 0;
  const qr = AppDataSource.createQueryRunner();
  await qr.connect();
  await qr.startTransaction();
  try {
    for (const row of raw) {
      if (!Array.isArray(row)) continue;
      const phone = normalizePhone(cell(row, m.phone, 50));
      const name = (nameIdx >= 0 ? cell(row, nameIdx, 200) : null) || phone;
      if (!name) {
        skipped++;
        continue;
      }
      const email = cell(row, m.email, 200);
      const notes = cell(row, m.notes);
      if (phone && (existingPhones.has(phone) || seenPhones.has(phone))) {
        skipped++;
        continue;
      }
      if (phone) seenPhones.add(phone);
      const agentId =
        input.assignment?.mode === "roundrobin"
          ? roundRobin[rr++ % roundRobin.length]
          : input.assignment?.mode === "random"
            ? roundRobin[Math.floor(Math.random() * roundRobin.length)]
            : assignAgentId;
      await qr.query(
        `INSERT INTO leads (company_id, assigned_agent_id, requested_by_agent_id, created_by_type, created_by_id, source, name, phone, email, notes, status, request_status, assigned_at)
         VALUES ($1, $2, NULL, 'admin', $3, 'import', $4, $5, $6, $7, 'new', NULL, CASE WHEN $2::int IS NULL THEN NULL ELSE now() END)`,
        [admin.companyId, agentId, admin.adminId, name, phone, email, notes],
      );
      imported++;
    }
    await qr.commitTransaction();
  } catch (err) {
    await qr.rollbackTransaction();
    throw err;
  } finally {
    await qr.release();
  }
  return { imported, skipped, total: raw.length };
}

export async function adminRejectRequest(admin: AdminContext, id: number, reason?: string | null) {
  const note = str(reason, 500);
  const rows = returnedRows(
    await AppDataSource.query(
      `UPDATE leads SET request_status = 'rejected',
         notes = CASE WHEN $3::text IS NULL THEN notes ELSE COALESCE(notes || E'\n', '') || '[Rejected] ' || $3 END,
         updated_at = now()
       WHERE id = $1 AND company_id = $2 AND request_status = 'pending' AND deleted_at IS NULL RETURNING ${COLS}`,
      [id, admin.companyId, note],
    ),
  );
  if (rows.length === 0) throw notFound("Pending request not found");
  return rows[0];
}
