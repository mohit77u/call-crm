import { AppDataSource, returnedRows } from "../../database";
import { badRequest, notFound } from "../../shared/errors";
import { isLeadStatus } from "../../shared/leads";
import * as XLSX from "xlsx";
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

// "RAJESH KUMAR" / "rajesh kumar" -> "Rajesh Kumar"
function toTitleCase(v: string) {
  return v.toLowerCase().replace(/(^|\s)(\S)/g, (_m, sp: string, c: string) => sp + c.toUpperCase());
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
     ORDER BY assigned_at DESC NULLS LAST, created_at DESC, id DESC LIMIT 500`,
    [agent.companyId, agent.agentId],
  );
  return withNormalizedPhones(rows);
}

export async function agentExportLeadsRows(agent: AgentContext, filters: { status?: string; q?: string; accountCreated?: string; createdFrom?: string; createdTo?: string }) {
  const where = ["l.company_id = $1", "l.assigned_agent_id = $2", "l.deleted_at IS NULL", "(l.request_status IS NULL OR l.request_status = 'approved')"];
  const params: unknown[] = [agent.companyId, agent.agentId];
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
    if (!phone) throw badRequest("Enter a valid phone number");
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

export async function adminDeleteLeadsBulk(admin: AdminContext, input: { ids?: number[]; all?: boolean }) {
  const ids = Array.isArray(input.ids) ? input.ids.filter((n) => Number.isInteger(n) && n > 0).slice(0, 5000) : [];
  if (!input.all && ids.length === 0) throw badRequest("Nothing to delete");
  const requested = input.all ? -1 : ids.length;
  const rows = returnedRows(
    await AppDataSource.query(
      input.all
        ? "UPDATE leads SET deleted_at = now(), updated_at = now() WHERE company_id = $1 AND deleted_at IS NULL RETURNING id"
        : "UPDATE leads SET deleted_at = now(), updated_at = now() WHERE company_id = $1 AND id = ANY($2::int[]) AND deleted_at IS NULL RETURNING id",
      input.all ? [admin.companyId] : [admin.companyId, ids],
    ),
  );
  return { deleted: rows.length, requested };
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

const MAX_IMPORT_ROWS = 20000;

export async function adminImportLeads(
  admin: AdminContext,
  input: {
    rows: unknown;
    mapping: { name?: number; phone?: number; email?: number; notes?: number };
    assignment: { mode: "none" | "agent" | "roundrobin" | "random"; agentId?: number | null };
  },
  opts?: { progressImportId?: number; startIndex?: number; baseImported?: number; baseFailed?: number },
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

  // NOTE: the leads_company_phone unique index covers soft-deleted rows too,
  // so phones must be deduped against ALL rows (including deleted). A deleted
  // lead with the same phone is revived (undeleted + refreshed) on import.
  const existingByPhone = new Map<string, { id: number; deleted: boolean; agentId: number | null }>();
  for (const r of (await AppDataSource.query(
    "SELECT id, phone, deleted_at, assigned_agent_id FROM leads WHERE company_id = $1 AND phone IS NOT NULL AND phone <> ''",
    [admin.companyId],
  )) as { id: number; phone: string; deleted_at: unknown; assigned_agent_id: number | null }[]) {
    existingByPhone.set(r.phone, { id: r.id, deleted: r.deleted_at != null, agentId: r.assigned_agent_id });
  }
  const seenPhones = new Set<string>();
  const failures: { cells: unknown[]; reason: string }[] = [];

  let imported = 0;
  let skipped = 0;
  let rr = 0;
  const progressId = opts?.progressImportId;
  const startIndex = opts?.startIndex ?? 0;
  const baseImported = opts?.baseImported ?? 0;
  const baseFailed = opts?.baseFailed ?? 0;
  // Rows are processed in chunks: classification is in-memory, inserts go
  // through bulk unnest queries (~500 rows per statement) so 10-20k row
  // files finish in seconds instead of minutes of per-row round-trips.
  const CHUNK = progressId ? 100 : Math.max(raw.length, 1);
  const qr = AppDataSource.createQueryRunner();
  await qr.connect();
  await qr.startTransaction();
  // Counts stored on the import row are cumulative across retries: this run's
  // counters are added on top of whatever earlier attempts already committed.
  // Failures are appended per chunk so a mid-import crash never loses them.
  let failuresWritten = 0;
  const flushProgress = async (cursor: number) => {
    await qr.commitTransaction();
    const newFailures = failures.slice(failuresWritten);
    failuresWritten = failures.length;
    await AppDataSource.query(
      `UPDATE lead_imports SET imported = $2, failed = $3, total_rows = $4, pending = $5, cursor = $6,
         error_rows = COALESCE(error_rows, '[]'::jsonb) || $7::jsonb
       WHERE id = $1`,
      [
        progressId,
        baseImported + imported,
        baseFailed + skipped,
        raw.length,
        Math.max(0, raw.length - baseImported - imported - baseFailed - skipped),
        cursor,
        JSON.stringify(newFailures),
      ],
    );
    await qr.startTransaction();
  };
  type RowItem = { name: string; phone: string | null; email: string | null; notes: string | null; agentId: number | null; cells: unknown[] };
  const rowError = (rowErr: unknown) => {
    const msg = rowErr instanceof Error ? rowErr.message : String(rowErr);
    return /duplicate key/i.test(msg) ? "Duplicate phone" : msg.slice(0, 120);
  };

  try {
    for (let chunkStart = startIndex; chunkStart < raw.length; chunkStart += CHUNK) {
      const chunkEnd = Math.min(chunkStart + CHUNK, raw.length);
      const inserts: RowItem[] = [];
      const updates: (RowItem & { id: number })[] = [];
      const revives: (RowItem & { id: number })[] = [];

      // ---- Phase 1: classify rows (pure in-memory, fast) ----
      for (let i = chunkStart; i < chunkEnd; i++) {
        const row = raw[i];
        if (!Array.isArray(row)) continue;
        const phone = normalizePhone(cell(row, m.phone, 50));
        if (!phone) {
          skipped++;
          failures.push({ cells: row, reason: "Invalid phone number (expected 10 digits)" });
          continue;
        }
        const rawName = nameIdx >= 0 ? cell(row, nameIdx, 200) : null;
        const name = (rawName ? toTitleCase(rawName) : null) || phone;
        const emailRaw = cell(row, m.email, 200);
        const email = emailRaw ? emailRaw.toLowerCase() : null;
        const notes = cell(row, m.notes);
        const existing = phone ? existingByPhone.get(phone) : undefined;
        // Duplicate handling: same phone already on an ACTIVE lead that is
        // assigned to an agent -> skip. Unassigned active lead -> refresh its
        // fields. Deleted lead -> revive.
        if ((phone && seenPhones.has(phone)) || (existing && !existing.deleted && existing.agentId != null)) {
          skipped++;
          failures.push({ cells: row, reason: "Duplicate phone" });
          continue;
        }
        if (phone) seenPhones.add(phone);
        const agentId =
          input.assignment?.mode === "roundrobin"
            ? roundRobin[rr++ % roundRobin.length]
            : input.assignment?.mode === "random"
              ? roundRobin[Math.floor(Math.random() * roundRobin.length)]
              : assignAgentId;
        const item: RowItem = { name, phone, email, notes, agentId, cells: row };
        if (existing && !existing.deleted) updates.push({ ...item, id: existing.id });
        else if (existing) revives.push({ ...item, id: existing.id });
        else inserts.push(item);
      }

      // ---- Phase 2a: bulk INSERT new leads (unnest, 500 per statement) ----
      for (let k = 0; k < inserts.length; k += 500) {
        const part = inserts.slice(k, k + 500);
        await qr.query("SAVEPOINT bulk_insert");
        try {
          await qr.query(
            `INSERT INTO leads (company_id, assigned_agent_id, requested_by_agent_id, created_by_type, created_by_id, source, name, phone, email, notes, status, request_status, assigned_at)
             SELECT $1, a.agent_id, NULL, 'admin', $2, 'import', a.name, a.phone, a.email, a.notes, 'new', NULL,
                    CASE WHEN a.agent_id IS NULL THEN NULL ELSE now() END
             FROM unnest($3::text[], $4::text[], $5::text[], $6::text[], $7::int[]) AS a(name, phone, email, notes, agent_id)`,
            [
              admin.companyId,
              admin.adminId,
              part.map((r) => r.name),
              part.map((r) => r.phone),
              part.map((r) => r.email),
              part.map((r) => r.notes),
              part.map((r) => r.agentId),
            ],
          );
          await qr.query("RELEASE SAVEPOINT bulk_insert");
          imported += part.length;
        } catch (bulkErr) {
          // Bulk chunk failed — fall back to per-row inserts so one bad row
          // can't take the rest of the chunk down with it.
          await qr.query("ROLLBACK TO SAVEPOINT bulk_insert");
          for (const it of part) {
            await qr.query("SAVEPOINT lead_row");
            try {
              await qr.query(
                `INSERT INTO leads (company_id, assigned_agent_id, requested_by_agent_id, created_by_type, created_by_id, source, name, phone, email, notes, status, request_status, assigned_at)
                 VALUES ($1, $2, NULL, 'admin', $3, 'import', $4, $5, $6, $7, 'new', NULL, CASE WHEN $2::int IS NULL THEN NULL ELSE now() END)`,
                [admin.companyId, it.agentId, admin.adminId, it.name, it.phone, it.email, it.notes],
              );
              await qr.query("RELEASE SAVEPOINT lead_row");
              imported++;
            } catch (rowErr) {
              await qr.query("ROLLBACK TO SAVEPOINT lead_row");
              skipped++;
              failures.push({ cells: it.cells, reason: rowError(rowErr) });
            }
          }
        }
      }

      // ---- Phase 2b: UPDATE unassigned duplicates + revive deleted ----
      for (const [kind, list] of [["update", updates], ["revive", revives]] as const) {
        for (const it of list) {
          await qr.query("SAVEPOINT lead_row");
          try {
            if (kind === "update") {
              await qr.query(
                `UPDATE leads SET name = $3, phone = $4, email = $5, notes = $6, updated_at = now()
                 WHERE id = $1 AND company_id = $2`,
                [it.id, admin.companyId, it.name, it.phone, it.email, it.notes],
              );
            } else {
              await qr.query(
                `UPDATE leads SET deleted_at = NULL, name = $3, phone = $4, email = $5, notes = $6,
                   assigned_agent_id = $7, assigned_at = CASE WHEN $7::int IS NULL THEN assigned_at ELSE now() END,
                   source = 'import', updated_at = now()
                 WHERE id = $1 AND company_id = $2`,
                [it.id, admin.companyId, it.name, it.phone, it.email, it.notes, it.agentId],
              );
            }
            await qr.query("RELEASE SAVEPOINT lead_row");
            imported++;
          } catch (rowErr) {
            await qr.query("ROLLBACK TO SAVEPOINT lead_row");
            skipped++;
            failures.push({ cells: it.cells, reason: rowError(rowErr) });
          }
        }
      }

      // ---- Phase 3: commit chunk + persist progress/cursor ----
      if (progressId) await flushProgress(chunkEnd);
    }
    await qr.commitTransaction();
    if (progressId) {
      const remaining = failures.slice(failuresWritten);
      await AppDataSource.query(
        `UPDATE lead_imports SET imported = $2, failed = $3, total_rows = $4, pending = $5, cursor = $6,
           error_rows = COALESCE(error_rows, '[]'::jsonb) || $7::jsonb
         WHERE id = $1`,
        [
          progressId,
          baseImported + imported,
          baseFailed + skipped,
          raw.length,
          Math.max(0, raw.length - baseImported - imported - baseFailed - skipped),
          raw.length,
          JSON.stringify(remaining),
        ],
      );
    }
  } catch (err) {
    await qr.rollbackTransaction().catch(() => {});
    throw err;
  } finally {
    await qr.release();
  }
  return { imported, skipped, total: raw.length, failures };
}

// ---------- File import (raw upload parsed server-side) ----------

const IMPORT_HEADER_KEYS: Record<"name" | "phone" | "email" | "notes", string[]> = {
  name: ["name", "customer", "lead", "contact person"],
  phone: ["phone", "mobile", "contact", "number", "tel"],
  email: ["email", "mail"],
  notes: ["note", "remark", "comment", "description"],
};

function guessImportMapping(headers: string[]) {
  const find = (keys: string[]) => headers.findIndex((h) => keys.some((k) => h.toLowerCase().includes(k)));
  const nameIdx = find(IMPORT_HEADER_KEYS.name);
  return {
    name: nameIdx >= 0 ? nameIdx : undefined,
    phone: find(IMPORT_HEADER_KEYS.phone),
    email: find(IMPORT_HEADER_KEYS.email),
    notes: find(IMPORT_HEADER_KEYS.notes),
  };
}

// Headerless fallback: score each column by content (phone-like, email-like,
// plain-text) so files without a header row still map correctly.
function guessMappingFromRows(rows: string[][], colCount: number) {
  const looksPhone = (v: string) => v.replace(/\D/g, "").length >= 10;
  const out: { phone?: number; email?: number; name?: number } = {};
  let phoneBest = 0;
  let emailBest = 0;
  let nameBest = 0;
  const nameCandidates: { idx: number; score: number }[] = [];
  for (let c = 0; c < colCount; c++) {
    let phone = 0;
    let email = 0;
    let text = 0;
    for (const row of rows.slice(0, 300)) {
      const v = String(row[c] ?? "").trim();
      if (!v) continue;
      if (looksPhone(v)) phone++;
      else if (v.includes("@")) email++;
      else if (/[a-zA-Z]/.test(v)) text++;
    }
    if (phone > phoneBest) {
      phoneBest = phone;
      out.phone = c;
    }
    if (email > emailBest) {
      emailBest = email;
      out.email = c;
    }
    nameCandidates.push({ idx: c, score: text });
  }
  nameCandidates.sort((a, b) => b.score - a.score);
  for (const cand of nameCandidates) {
    if (cand.idx !== out.phone && cand.idx !== out.email && cand.score > nameBest) {
      nameBest = cand.score;
      out.name = cand.idx;
      break;
    }
  }
  return out;
}

function colLetter(i: number) {
  let s = "";
  let n = i + 1;
  while (n > 0) {
    s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function sheetRowsToArrays(wb: XLSX.WorkBook, rowCap?: number) {
  return wb.SheetNames
    .map((n) => {
      const ws = wb.Sheets[n];
      const opts: XLSX.Sheet2JSONOpts = { header: 1, raw: false, defval: "" };
      if (rowCap && ws["!ref"]) {
        const range = XLSX.utils.decode_range(ws["!ref"]);
        range.e.r = Math.min(range.e.r, rowCap - 1);
        opts.range = range;
      }
      return XLSX.utils.sheet_to_json<string[]>(ws, opts) as string[][];
    })
    .map((rows) => rows.filter((r) => r.some((c) => String(c ?? "").trim() !== "")))
    .filter((rows) => rows.length > 0);
}

function parseImportBuffer(buffer: Buffer, hasHeader: boolean, rowCap?: number) {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheets = sheetRowsToArrays(wb, rowCap);
  if (!sheets.length) throw badRequest("No data found in file");

  let headers: string[];
  let dataRows: string[][];
  if (hasHeader) {
    const headKey = (r: string[]) => r.map((c) => String(c ?? "").trim().toLowerCase()).join("");
    headers = (sheets[0][0] ?? []).map((h) => String(h ?? "").trim());
    const key = headKey(headers.map(String));
    dataRows = [];
    for (const rows of sheets) {
      if (headKey(rows[0]) === key) dataRows.push(...rows.slice(1));
      else dataRows.push(...rows);
    }
  } else {
    const maxCols = sheets.reduce((m, rows) => Math.max(m, ...rows.map((r) => r.length)), 0);
    headers = Array.from({ length: maxCols }, (_, i) => colLetter(i));
    dataRows = sheets.flat();
  }
  dataRows = dataRows.slice(0, MAX_IMPORT_ROWS);
  if (!dataRows.length) throw badRequest("File has no data rows");

  const guessed = guessImportMapping(headers);
  const heuristic = guessMappingFromRows(dataRows, headers.length);
  const mapping = {
    name: guessed.name ?? heuristic.name,
    phone: guessed.phone >= 0 ? guessed.phone : heuristic.phone,
    email: guessed.email >= 0 ? guessed.email : heuristic.email,
    notes: guessed.notes >= 0 ? guessed.notes : undefined,
  };
  if (mapping.phone == null) throw badRequest("Could not detect a phone column in the file");
  return { headers, rows: dataRows, mapping };
}

type ImportAssignment = { mode: "none" | "agent" | "roundrobin" | "random"; agentId?: number | null };

export async function createLeadImport(
  admin: AdminContext,
  input: { buffer: Buffer; fileName: string; hasHeader: boolean; assignment: ImportAssignment },
) {
  // Parse once up-front: corrupt/unreadable files fail fast at upload time.
  // Preview parse: only first ~10 rows/sheet — just enough to validate the
  // file is non-empty and guess column mapping. The worker re-parses fully.
  const parsed = parseImportBuffer(input.buffer, input.hasHeader, 10);
  // Abandoned previews (modal closed before confirm) are safe to drop.
  await AppDataSource.query(
    "DELETE FROM lead_imports WHERE company_id = $1 AND status = 'awaiting_mapping'",
    [admin.companyId],
  );
  const rows = returnedRows(
    await AppDataSource.query(
      `INSERT INTO lead_imports (company_id, file_name, file_data, file_headers, has_header, assign_mode, assign_agent_id, created_by_admin_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'awaiting_mapping') RETURNING id`,
      [
        admin.companyId,
        str(input.fileName, 300) ?? "import",
        input.buffer,
        JSON.stringify(parsed.headers),
        input.hasHeader,
        input.assignment.mode,
        input.assignment.mode === "agent" ? input.assignment.agentId ?? null : null,
        admin.adminId,
      ],
    ),
  );
  return { id: (rows[0] as { id: number }).id, headers: parsed.headers, mapping: parsed.mapping };
}

export async function listLeadImports(admin: AdminContext) {
  return AppDataSource.query(
    `SELECT id, file_name AS "fileName", has_header AS "hasHeader", status,
       total_rows AS "totalRows", imported, failed, pending,
       error_message AS "errorMessage", created_at AS "createdAt", completed_at AS "completedAt"
     FROM lead_imports WHERE company_id = $1 AND status <> 'awaiting_mapping' ORDER BY created_at DESC LIMIT 100`,
    [admin.companyId],
  );
}

export async function confirmLeadImport(
  admin: AdminContext,
  id: number,
  mapping: { name?: number; phone?: number; email?: number; notes?: number },
  assign?: { mode?: "none" | "agent" | "roundrobin" | "random"; agentId?: number | null },
) {
  if (mapping.phone == null) throw badRequest("Map the Phone column");
  if (assign?.mode === "agent" && !assign.agentId) throw badRequest("Select an agent");
  const rows = await AppDataSource.query(
    `UPDATE lead_imports SET column_mapping = $3, status = 'processing',
       assign_mode = COALESCE($4, assign_mode),
       assign_agent_id = CASE WHEN $4 = 'agent' THEN $5 ELSE assign_agent_id END
     WHERE id = $1 AND company_id = $2 AND status = 'awaiting_mapping' RETURNING id`,
    [
      id,
      admin.companyId,
      JSON.stringify(mapping),
      assign?.mode ?? null,
      assign?.mode === "agent" ? (assign.agentId ?? null) : null,
    ],
  );
  if (!rows[0]) throw notFound("Import not found or already started");
  return { id };
}

// Called by the queue worker when a job permanently fails (all attempts
// exhausted) so the import row doesn't stay stuck on 'processing'.
export async function markLeadImportFailed(importId: number, message: string) {
  await AppDataSource.query(
    `UPDATE lead_imports SET status = 'failed', error_message = $2, completed_at = now()
     WHERE id = $1 AND status = 'processing'`,
    [importId, String(message).slice(0, 500)],
  );
}

export async function getLeadImportResult(admin: AdminContext, id: number) {
  const rows = await AppDataSource.query(
    `SELECT total_rows AS "totalRows", imported, failed FROM lead_imports WHERE id = $1 AND company_id = $2`,
    [id, admin.companyId],
  );
  if (!rows[0]) throw notFound("Import not found");
  const r = rows[0] as { totalRows: number; imported: number; failed: number };
  return { imported: r.imported, skipped: r.failed, total: r.totalRows };
}

export async function getLeadImportErrors(admin: AdminContext, id: number) {
  const rows = await AppDataSource.query(
    `SELECT file_headers AS "fileHeaders", error_rows AS "errorRows"
     FROM lead_imports WHERE id = $1 AND company_id = $2`,
    [id, admin.companyId],
  );
  if (!rows[0]) return null;
  return {
    headers: (rows[0].fileHeaders as string[]) ?? [],
    errors: (rows[0].errorRows as { cells: unknown[]; reason: string }[]) ?? [],
  };
}

// Runs inside the BullMQ worker (or inline fallback). Idempotent: skips rows
// already marked completed/failed and relies on phone dedupe for re-runs.
export async function processLeadImport(importId: number, opts?: { finalAttempt?: boolean }) {
  const imports = await AppDataSource.query("SELECT * FROM lead_imports WHERE id = $1", [importId]);
  const imp = imports[0] as
    | {
        id: number;
        company_id: number;
        file_data: Buffer;
        has_header: boolean;
        assign_mode: string;
        assign_agent_id: number | null;
        created_by_admin_id: number | null;
        status: string;
        column_mapping: { name?: number; phone?: number; email?: number; notes?: number } | null;
        cursor: number;
        imported: number;
        failed: number;
      }
    | undefined;
  if (!imp || imp.status !== "processing") return;
  console.log(`[lead-imports] processing import #${imp.id} (company ${imp.company_id})`);

  try {
    const admins = await AppDataSource.query(
      `SELECT a.id, a.name, a.email, a.company_id, c.name AS company_name, c.client_code, c.features
       FROM admins a JOIN companies c ON c.id = a.company_id
       WHERE a.id = $1 AND a.company_id = $2 AND a.deleted_at IS NULL`,
      [imp.created_by_admin_id, imp.company_id],
    );
    const a = admins[0];
    if (!a) throw new Error("Importing admin no longer exists");
    const admin: AdminContext = {
      adminId: a.id,
      name: a.name,
      email: a.email,
      companyId: a.company_id,
      companyName: a.company_name,
      clientCode: a.client_code,
      features: (a.features as Record<string, unknown>) ?? {},
    };

    const { headers, rows, mapping: autoMapping } = parseImportBuffer(Buffer.from(imp.file_data), imp.has_header);
    const baseImp = imp.imported ?? 0;
    const baseFail = imp.failed ?? 0;
    await AppDataSource.query(
      "UPDATE lead_imports SET total_rows = $2, pending = $3 WHERE id = $1",
      [imp.id, rows.length, Math.max(0, rows.length - baseImp - baseFail)],
    );
    const cm = imp.column_mapping;
    const mapping = cm?.phone != null
      ? { name: cm.name, phone: cm.phone, email: cm.email, notes: cm.notes }
      : autoMapping;
    const result = await adminImportLeads(admin, {
      rows,
      mapping,
      assignment: {
        mode: (["none", "agent", "roundrobin", "random"] as const).includes(imp.assign_mode as never)
          ? (imp.assign_mode as ImportAssignment["mode"])
          : "none",
        agentId: imp.assign_agent_id,
      },
    },
      {
        progressImportId: imp.id,
        startIndex: imp.cursor ?? 0,
        baseImported: imp.imported ?? 0,
        baseFailed: imp.failed ?? 0,
      },
    );

    const cumImported = baseImp + result.imported;
    const cumFailed = baseFail + result.skipped;
    await AppDataSource.query(
      `UPDATE lead_imports SET status = 'completed', total_rows = $2, imported = $3, failed = $4,
         pending = $5, file_headers = $6, completed_at = now() WHERE id = $1`,
      [
        imp.id,
        result.total,
        cumImported,
        cumFailed,
        Math.max(0, result.total - cumImported - cumFailed),
        JSON.stringify(headers),
      ],
    );
    console.log(`[lead-imports] import #${imp.id} completed: ${cumImported} imported, ${cumFailed} failed, ${result.total} total`);
  } catch (err) {
    console.error(`[lead-imports] import #${imp.id} failed:`, err instanceof Error ? err.message : err);
    // Only mark 'failed' on the last attempt — earlier failures are retried
    // by BullMQ and the row must stay 'processing' for the retry to run.
    if (opts?.finalAttempt !== false) {
      await AppDataSource.query(
        `UPDATE lead_imports SET status = 'failed', error_message = $2, completed_at = now() WHERE id = $1`,
        [imp.id, String(err instanceof Error ? err.message : err).slice(0, 500)],
      );
    }
    throw err;
  }
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
