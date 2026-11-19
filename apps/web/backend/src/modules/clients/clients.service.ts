import { AppDataSource, returnedRows } from "../../database";
import { badRequest, notFound } from "../../shared/errors";
import { csvCell, sendCsv } from "../../shared/csv";
import { TIME_ZONE } from "../../shared/calls";
import * as XLSX from "xlsx";
import type { AdminContext, AgentContext } from "../../middleware/auth";

const COLS = `id, company_id AS "companyId", agent_id AS "agentId",
  client_code AS "clientCode", name, phone, email, address, pan_card AS "panCard",
  created_at AS "createdAt", updated_at AS "updatedAt"`;

const COLS_L = `c.id, c.company_id AS "companyId", c.agent_id AS "agentId",
  c.client_code AS "clientCode", c.name, c.phone, c.email, c.address, c.pan_card AS "panCard",
  a.name AS "agentName", c.created_at AS "createdAt", c.updated_at AS "updatedAt"`;

const CLIENT_FIELDS = ["clientCode", "name", "phone", "email", "address", "panCard"] as const;
type ClientField = (typeof CLIENT_FIELDS)[number];
type ClientInput = Partial<Record<ClientField, string | null>> & { agentId?: number | null };

function str(v: unknown, max = 500) {
  return v == null ? null : String(v).slice(0, max);
}

function normalizePhone(v: unknown): string | null {
  if (v == null) return null;
  const d = String(v).replace(/\D/g, "");
  return d.length >= 10 ? d.slice(-10) : null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateClientInput(input: ClientInput, { partial = false } = {}): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const need = (key: ClientField, label: string) => {
    const v = input[key];
    if (v == null || String(v).trim() === "") {
      if (!partial) throw badRequest(`${label} is required`);
      return;
    }
    out[key] = String(v).trim().slice(0, key === "address" ? 1000 : 200);
    if (key === "clientCode") out[key] = String(out[key]).toUpperCase();
  };
  if ("clientCode" in input || !partial) need("clientCode", "Client code");
  if ("name" in input || !partial) need("name", "Name");
  if ("phone" in input || !partial) {
    const phone = normalizePhone(input.phone);
    if (!phone) throw badRequest(partial ? "Enter a valid phone number" : "Phone is required");
    if (input.phone != null && String(input.phone).trim() !== "") out.phone = phone;
    else if (!partial) throw badRequest("Phone is required");
  }
  if ("email" in input || !partial) {
    const email = str(input.email, 200)?.trim().toLowerCase() ?? null;
    if (!email) {
      if (!partial) throw badRequest("Email is required");
    } else {
      if (!EMAIL_RE.test(email)) throw badRequest("Enter a valid email");
      out.email = email;
    }
  }
  for (const key of ["address", "panCard"] as const) {
    if (key in input) out[key] = key === "panCard" ? str(input[key], 20)?.toUpperCase() ?? null : str(input[key], 1000);
  }
  return out;
}

async function assertCodeAvailable(companyId: number, code: string, excludeId?: number) {
  const rows = await AppDataSource.query(
    `SELECT id FROM clients WHERE company_id = $1 AND client_code = $2 AND deleted_at IS NULL ${excludeId ? "AND id <> $3" : ""}`,
    excludeId ? [companyId, code, excludeId] : [companyId, code],
  );
  if (rows[0]) throw badRequest(`Client code '${code}' already exists`);
}

async function assertAgentInCompany(companyId: number, agentId: number) {
  const rows = await AppDataSource.query(
    `SELECT id FROM agents WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL AND active`,
    [agentId, companyId],
  );
  if (!rows[0]) throw badRequest("Agent not found");
}

const CODE_RE = /^[A-Za-z0-9][A-Za-z0-9_\-]{0,49}$/;

// ---------- Agent side ----------

export async function agentListClients(agent: AgentContext) {
  const rows = await AppDataSource.query(
    `SELECT ${COLS} FROM clients
     WHERE company_id = $1 AND agent_id = $2 AND deleted_at IS NULL
     ORDER BY created_at DESC, id DESC LIMIT 2000`,
    [agent.companyId, agent.agentId],
  );
  return rows;
}

export async function agentCreateClient(agent: AgentContext, input: ClientInput) {
  const fields = validateClientInput(input);
  const code = String(fields.clientCode);
  if (!CODE_RE.test(code)) throw badRequest("Client code: letters, numbers, - and _ only (max 50)");
  await assertCodeAvailable(agent.companyId, code);
  const rows = await AppDataSource.query(
    `INSERT INTO clients (company_id, agent_id, client_code, name, phone, email, address, pan_card, created_by_type, created_by_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'agent',$9) RETURNING ${COLS}`,
    [agent.companyId, agent.agentId, code, fields.name, fields.phone, fields.email, fields.address ?? null, fields.panCard ?? null, agent.agentId],
  );
  return returnedRows(rows)[0];
}

export async function agentUpdateClient(agent: AgentContext, id: number, input: ClientInput) {
  const own = await AppDataSource.query(
    `SELECT id FROM clients WHERE id = $1 AND company_id = $2 AND agent_id = $3 AND deleted_at IS NULL`,
    [id, agent.companyId, agent.agentId],
  );
  if (!own[0]) throw notFound("Client not found");
  const fields = validateClientInput(input, { partial: true });
  if ("clientCode" in fields) {
    const code = String(fields.clientCode);
    if (!CODE_RE.test(code)) throw badRequest("Client code: letters, numbers, - and _ only (max 50)");
    await assertCodeAvailable(agent.companyId, code, id);
    fields.clientCode = code;
  }
  const keys = Object.keys(fields);
  if (keys.length === 0) throw badRequest("Nothing to update");
  const sets = keys.map((k, i) => `${k === "panCard" ? "pan_card" : k === "clientCode" ? "client_code" : k} = $${i + 4}`).join(", ");
  const params = [id, agent.companyId, agent.agentId, ...keys.map((k) => fields[k])];
  const rows = await AppDataSource.query(
    `UPDATE clients SET ${sets}, updated_at = now() WHERE id = $1 AND company_id = $2 AND agent_id = $3 AND deleted_at IS NULL RETURNING ${COLS}`,
    params,
  );
  return returnedRows(rows)[0];
}

export async function agentDeleteClient(agent: AgentContext, id: number) {
  const rows = await AppDataSource.query(
    `UPDATE clients SET deleted_at = now() WHERE id = $1 AND company_id = $2 AND agent_id = $3 AND deleted_at IS NULL RETURNING id`,
    [id, agent.companyId, agent.agentId],
  );
  if (!returnedRows(rows)[0]) throw notFound("Client not found");
  return { deleted: true };
}

// ---------- Company admin side ----------

export async function adminListClients(admin: AdminContext, agentFilter?: string) {
  const where = ["c.company_id = $1", "c.deleted_at IS NULL"];
  const params: unknown[] = [admin.companyId];
  if (agentFilter === "none") where.push("c.agent_id IS NULL");
  else if (agentFilter && /^\d+$/.test(agentFilter)) {
    params.push(Number(agentFilter));
    where.push(`c.agent_id = $${params.length}`);
  }
  const rows = await AppDataSource.query(
    `SELECT ${COLS_L} FROM clients c LEFT JOIN agents a ON a.id = c.agent_id
     WHERE ${where.join(" AND ")} ORDER BY c.created_at DESC, c.id DESC LIMIT 5000`,
    params,
  );
  return rows;
}

export async function adminListAgents(companyId: number) {
  return AppDataSource.query(
    `SELECT id, name FROM agents WHERE company_id = $1 AND deleted_at IS NULL AND active ORDER BY name`,
    [companyId],
  );
}

export async function adminCreateClient(admin: AdminContext, input: ClientInput) {
  const fields = validateClientInput(input);
  const code = String(fields.clientCode);
  if (!CODE_RE.test(code)) throw badRequest("Client code: letters, numbers, - and _ only (max 50)");
  await assertCodeAvailable(admin.companyId, code);
  let agentId: number | null = null;
  if (input.agentId != null) {
    await assertAgentInCompany(admin.companyId, input.agentId);
    agentId = input.agentId;
  }
  const rows = await AppDataSource.query(
    `INSERT INTO clients (company_id, agent_id, client_code, name, phone, email, address, pan_card, created_by_type, created_by_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'admin',$9) RETURNING ${COLS}`,
    [admin.companyId, agentId, code, fields.name, fields.phone, fields.email, fields.address ?? null, fields.panCard ?? null, admin.adminId],
  );
  return returnedRows(rows)[0];
}

export async function adminUpdateClient(admin: AdminContext, id: number, input: ClientInput) {
  const exists = await AppDataSource.query(
    `SELECT id FROM clients WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
    [id, admin.companyId],
  );
  if (!exists[0]) throw notFound("Client not found");
  const fields = validateClientInput(input, { partial: true });
  if ("agentId" in input) {
    if (input.agentId == null) fields.agentId = null;
    else {
      await assertAgentInCompany(admin.companyId, input.agentId);
      fields.agentId = input.agentId;
    }
  }
  if ("clientCode" in fields) {
    const code = String(fields.clientCode);
    if (!CODE_RE.test(code)) throw badRequest("Client code: letters, numbers, - and _ only (max 50)");
    await assertCodeAvailable(admin.companyId, code, id);
    fields.clientCode = code;
  }
  const keys = Object.keys(fields);
  if (keys.length === 0) throw badRequest("Nothing to update");
  const colOf = (k: string) => (k === "panCard" ? "pan_card" : k === "clientCode" ? "client_code" : k === "agentId" ? "agent_id" : k);
  const sets = keys.map((k, i) => `${colOf(k)} = $${i + 3}`).join(", ");
  const params = [id, admin.companyId, ...keys.map((k) => fields[k])];
  const rows = await AppDataSource.query(
    `UPDATE clients SET ${sets}, updated_at = now() WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL RETURNING ${COLS}`,
    params,
  );
  return returnedRows(rows)[0];
}

export async function adminDeleteClient(admin: AdminContext, id: number) {
  const rows = await AppDataSource.query(
    `UPDATE clients SET deleted_at = now() WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL RETURNING id`,
    [id, admin.companyId],
  );
  if (!returnedRows(rows)[0]) throw notFound("Client not found");
  return { deleted: true };
}

// ---------- Export ----------

export const CLIENTS_CSV_HEADER = "Client code,Name,Phone,Email,Address,Pan card,Agent,Created,Updated";

export async function agentExportClients(agent: AgentContext) {
  const rows = await AppDataSource.query(
    `SELECT ${COLS} FROM clients WHERE company_id = $1 AND agent_id = $2 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 10000`,
    [agent.companyId, agent.agentId],
  );
  return rows;
}

export async function adminExportClients(admin: AdminContext, agentFilter?: string) {
  const where = ["c.company_id = $1", "c.deleted_at IS NULL"];
  const params: unknown[] = [admin.companyId];
  if (agentFilter === "none") where.push("c.agent_id IS NULL");
  else if (agentFilter && /^\d+$/.test(agentFilter)) {
    params.push(Number(agentFilter));
    where.push(`c.agent_id = $${params.length}`);
  }
  return AppDataSource.query(
    `SELECT ${COLS_L} FROM clients c LEFT JOIN agents a ON a.id = c.agent_id
     WHERE ${where.join(" AND ")} ORDER BY c.created_at DESC LIMIT 10000`,
    params,
  );
}

function exportRows(rows: Record<string, unknown>[]) {
  const fmt = (v: unknown) => (v ? new Date(String(v)).toLocaleString("en-IN", { timeZone: TIME_ZONE }) : "");
  return rows.map((r) =>
    [r.clientCode, r.name, r.phone, r.email, r.address, r.panCard, r.agentName ?? "", fmt(r.createdAt), fmt(r.updatedAt)]
      .map(csvCell)
      .join(","),
  );
}

export function clientExportLines(rows: Record<string, unknown>[]) {
  return exportRows(rows);
}

// ---------- Import ----------

const ROW_CAP = 10000;

function sheetRowsToArrays(wb: XLSX.WorkBook): string[][] {
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, raw: false, defval: "" }) as string[][];
}

function parseImportBuffer(buffer: Buffer, hasHeader: boolean) {
  const wb = XLSX.read(buffer, { type: "buffer" });
  let rows = sheetRowsToArrays(wb).map((r) => r.map((c) => String(c ?? "").trim()));
  rows = rows.filter((r) => r.some((c) => c !== ""));
  if (rows.length === 0) throw badRequest("File has no data rows");
  const headers = hasHeader ? rows[0].map((h, i) => h || `Column ${i + 1}`) : rows[0].map((_, i) => `Column ${i + 1}`);
  const data = hasHeader ? rows.slice(1) : rows;
  if (data.length > ROW_CAP) throw badRequest(`Too many rows (max ${ROW_CAP})`);
  return { headers, rows: data };
}

const MAPPING_FIELDS: ClientField[] = ["clientCode", "name", "phone", "email", "address", "panCard"];

function guessClientMapping(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {};
  const used = new Set<number>();
  const pick = (field: ClientField, patterns: RegExp[]) => {
    for (let i = 0; i < headers.length; i++) {
      if (used.has(i)) continue;
      if (patterns.some((re) => re.test(headers[i].toLowerCase()))) {
        mapping[field] = i;
        used.add(i);
        return;
      }
    }
  };
  pick("clientCode", [/client\s*code/, /^code$/, /client\s*id/, /clientcode/]);
  pick("name", [/^name$/, /client\s*name/, /full\s*name/]);
  pick("phone", [/phone/, /mobile/, /contact/, /whatsapp/]);
  pick("email", [/e-?mail/]);
  pick("address", [/address/, /addr/]);
  pick("panCard", [/pan\s*card/, /^pan$/]);
  return mapping;
}

export async function createClientImport(
  ctx: { companyId: number; agentId: number | null; adminId: number | null },
  opts: { buffer: Buffer; fileName: string; hasHeader: boolean; assign: { mode: string; agentId: number | null } },
) {
  const { headers, rows } = parseImportBuffer(opts.buffer, opts.hasHeader);
  const mapping = guessClientMapping(headers);
  const mode = (["none", "agent", "roundrobin", "random"] as const).includes(opts.assign.mode as never)
    ? (opts.assign.mode as "none" | "agent" | "roundrobin" | "random")
    : "none";
  const assignAgentId = mode === "agent" && opts.assign.agentId ? opts.assign.agentId : null;
  if (assignAgentId) await assertAgentInCompany(ctx.companyId, assignAgentId);
  const ins = await AppDataSource.query(
    `INSERT INTO client_imports (company_id, agent_id, admin_id, file_name, file_headers, rows, has_header, column_mapping, assign_mode, assign_agent_id, status, total_rows)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'awaiting_mapping',$11) RETURNING id`,
    [ctx.companyId, ctx.agentId, ctx.adminId, opts.fileName, JSON.stringify(headers), JSON.stringify(rows), opts.hasHeader, JSON.stringify(mapping), mode, assignAgentId, rows.length],
  );
  return { id: returnedRows(ins)[0].id as number, headers, mapping };
}

export async function listClientImports(companyId: number) {
  return AppDataSource.query(
    `SELECT id, file_name AS "fileName", status, total_rows AS "totalRows", imported, updated, failed,
            error_message AS "errorMessage", created_at AS "createdAt", completed_at AS "completedAt"
     FROM client_imports WHERE company_id = $1 ORDER BY created_at DESC LIMIT 20`,
    [companyId],
  );
}

async function getImportRow(companyId: number, id: number) {
  const rows = await AppDataSource.query(
    `SELECT * FROM client_imports WHERE id = $1 AND company_id = $2`,
    [id, companyId],
  );
  const rec = returnedRows(rows)[0] as Record<string, unknown> | undefined;
  if (!rec) throw notFound("Import not found");
  return rec;
}

export async function confirmClientImport(
  companyId: number,
  id: number,
  mapping: Record<string, number>,
): Promise<{ imported: number; updated: number; failed: number; total: number }> {
  const rec = await getImportRow(companyId, id);
  if (rec.status === "completed" || rec.status === "processing") {
    throw badRequest("Import already processed");
  }
  const headers = rec.file_headers as string[];
  const dataRows = rec.rows as string[][];
  const clean: Record<string, number> = {};
  for (const f of MAPPING_FIELDS) {
    const idx = mapping[f];
    if (typeof idx === "number" && idx >= 0 && idx < headers.length) clean[f] = idx;
  }
  if (clean.clientCode == null || clean.name == null || clean.phone == null || clean.email == null) {
    throw badRequest("Map Client code, Name, Phone and Email columns");
  }

  const mode = (rec.assign_mode as string) || "none";
  const fixedAgentId = rec.assign_agent_id != null ? Number(rec.assign_agent_id) : null;
  const companyIdNum = Number(rec.company_id);
  const isAgentImport = rec.agent_id != null;
  const ownerAgentId = isAgentImport ? Number(rec.agent_id) : null;

  // agents available for roundrobin/random
  let pool: number[] = [];
  if (mode === "roundrobin" || mode === "random") {
    const agents = await AppDataSource.query(
      `SELECT id FROM agents WHERE company_id = $1 AND deleted_at IS NULL AND active ORDER BY id`,
      [companyIdNum],
    );
    pool = agents.map((a: { id: number }) => a.id);
    if (pool.length === 0) throw badRequest("No active agents to assign clients to");
  }

  const errors: { values: string[]; error: string }[] = [];
  let imported = 0;
  let updated = 0;
  let rr = 0;

  const pickAgent = () => {
    if (isAgentImport) return ownerAgentId;
    if (mode === "agent") return fixedAgentId;
    if (mode === "roundrobin") return pool[rr++ % pool.length];
    if (mode === "random") return pool[Math.floor(Math.random() * pool.length)];
    return null;
  };

  for (let i = 0; i < dataRows.length; i++) {
    const raw = dataRows[i];
    const get = (f: ClientField) => (clean[f] != null ? String(raw[clean[f]] ?? "").trim() : "");
    const clientCode = get("clientCode").toUpperCase();
    const name = get("name");
    const phoneRaw = get("phone");
    const email = get("email").toLowerCase();
    const address = get("address") || null;
    const panCard = get("panCard").toUpperCase() || null;
    const fail = (msg: string) => errors.push({ values: raw, error: msg });

    if (!clientCode) { fail("Client code is required"); continue; }
    if (!CODE_RE.test(clientCode)) { fail("Invalid client code (letters, numbers, - and _ only)"); continue; }
    if (!name) { fail("Name is required"); continue; }
    const phone = normalizePhone(phoneRaw);
    if (!phone) { fail("Phone is required (10 digits)"); continue; }
    if (!email) { fail("Email is required"); continue; }
    if (!EMAIL_RE.test(email)) { fail("Invalid email"); continue; }

    try {
      const existing = await AppDataSource.query(
        `SELECT id, agent_id, deleted_at FROM clients WHERE company_id = $1 AND client_code = $2`,
        [companyIdNum, clientCode],
      );
      const ex = returnedRows<{ id: number; agent_id: number | null; deleted_at: string | null }>(existing)[0];
      const agentId = pickAgent();
      if (ex && !ex.deleted_at) {
        const sets: string[] = ["name = $3", "phone = $4", "email = $5", "address = $6", "pan_card = $7", "updated_at = now()"];
        const params: unknown[] = [ex.id, companyIdNum, name, phone, email, address, panCard];
        // assign during import only when the row has no agent yet
        if (agentId != null && ex.agent_id == null) {
          sets.push(`agent_id = $${params.length + 1}`);
          params.push(agentId);
        }
        await AppDataSource.query(`UPDATE clients SET ${sets.join(", ")} WHERE id = $1 AND company_id = $2`, params);
        updated++;
      } else if (ex && ex.deleted_at) {
        await AppDataSource.query(
          `UPDATE clients SET deleted_at = NULL, name=$3, phone=$4, email=$5, address=$6, pan_card=$7, agent_id=$8, updated_at=now() WHERE id=$1 AND company_id=$2`,
          [ex.id, companyIdNum, name, phone, email, address, panCard, agentId],
        );
        imported++;
      } else {
        await AppDataSource.query(
          `INSERT INTO clients (company_id, agent_id, client_code, name, phone, email, address, pan_card, created_by_type, created_by_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [companyIdNum, agentId, clientCode, name, phone, email, address, panCard, isAgentImport ? "agent" : "admin", isAgentImport ? ownerAgentId : rec.admin_id],
        );
        imported++;
      }
    } catch (e) {
      fail(e instanceof Error ? e.message : "Insert failed");
    }
  }

  await AppDataSource.query(
    `UPDATE client_imports SET status='completed', imported=$2, updated=$3, failed=$4, error_rows=$5, column_mapping=$6, completed_at=now() WHERE id=$1`,
    [id, imported, updated, errors.length, JSON.stringify(errors.slice(0, 2000)), JSON.stringify(clean)],
  );
  return { imported, updated, failed: errors.length, total: dataRows.length };
}

export async function getClientImportErrors(companyId: number, id: number) {
  const rec = await getImportRow(companyId, id);
  return {
    headers: rec.file_headers as string[],
    rows: rec.error_rows as { values: string[]; error: string }[],
  };
}
