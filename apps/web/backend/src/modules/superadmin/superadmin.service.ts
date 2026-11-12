import { AppDataSource } from "../../database";
import { TIME_ZONE } from "../../shared/calls";
import { badRequest, notFound } from "../../shared/errors";
import type { CompanyFeatures } from "../../shared/features";
import {
  createCompanyWithAdmin,
  getOr404,
  regenerateClientCode,
  updateCompany,
} from "../companies/companies.service";
import { platformExportCallsRows, platformListCalls, type CallFilters } from "../call-logs/calls.service";

export async function overview(q: string) {
  const params: unknown[] = [];
  let where = "true";
  if (q) {
    params.push(`%${q}%`);
    where = `(c.name ILIKE $1 OR c.client_code ILIKE $1 OR COALESCE(a.email, '') ILIKE $1)`;
  }
  const totals = await AppDataSource.query(
    `SELECT (SELECT count(*)::int FROM companies) AS companies,
            (SELECT count(*)::int FROM agents) AS agents,
            (SELECT count(*)::int FROM call_logs) AS calls`,
  );
  const companies = await AppDataSource.query(
    `SELECT c.id, c.name, c.client_code, c.features, c.plan, c.created_at,
       (SELECT a.email FROM admins a WHERE a.company_id = c.id ORDER BY a.id LIMIT 1) AS admin_email,
       (SELECT count(*)::int FROM agents ag WHERE ag.company_id = c.id) AS agents,
       (SELECT count(*)::int FROM call_logs cl WHERE cl.company_id = c.id) AS calls
     FROM companies c
     LEFT JOIN LATERAL (SELECT email FROM admins WHERE company_id = c.id ORDER BY id LIMIT 1) a ON true
     WHERE ${where}
     ORDER BY c.created_at DESC`,
    params,
  );
  return { totals: totals[0] ?? null, companies };
}

export async function listCompanies() {
  return AppDataSource.query("SELECT id, name FROM companies ORDER BY name");
}

export async function listAgents(company: string, q: string) {
  const params: unknown[] = [];
  const where = ["true"];
  if (company) {
    params.push(Number(company));
    where.push(`a.company_id = $${params.length}`);
  }
  if (q) {
    params.push(`%${q}%`);
    where.push(`(a.name ILIKE $${params.length} OR a.username ILIKE $${params.length} OR c.name ILIKE $${params.length})`);
  }
  const agents = await AppDataSource.query(
    `SELECT a.id, a.name, a.username, a.phone, a.active, c.name AS company, a.company_id,
       (SELECT max(d.last_sync_at) FROM devices d WHERE d.agent_id = a.id AND NOT d.revoked) AS last_sync_at
     FROM agents a JOIN companies c ON c.id = a.company_id
     WHERE ${where.join(" AND ")}
     ORDER BY c.name, a.name`,
    params,
  );
  return { agents, companies: await listCompanies() };
}

export async function companyDetail(id: number) {
  const company = await getOr404(id);
  const admins = await AppDataSource.query(
    "SELECT id, name, email, created_at AS \"createdAt\" FROM admins WHERE company_id = $1 ORDER BY id",
    [id],
  );
  const counts = await AppDataSource.query(
    `SELECT (SELECT count(*)::int FROM agents WHERE company_id = $1) AS agents,
            (SELECT count(*)::int FROM call_logs WHERE company_id = $1) AS calls,
            (SELECT count(*)::int FROM devices WHERE company_id = $1 AND NOT revoked) AS devices`,
    [id],
  );
  return { company, admins, counts: counts[0] ?? null };
}

export async function createCompany(input: {
  name: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  plan?: string;
  features?: CompanyFeatures;
}) {
  const email = input.adminEmail.trim().toLowerCase();
  const existing = await AppDataSource.query("SELECT 1 FROM admins WHERE email = $1", [email]);
  if (existing.length > 0) throw badRequest("This email is already registered");
  const { company, clientCode } = await createCompanyWithAdmin({ ...input, adminEmail: email });
  return { company, clientCode, adminEmail: email };
}

export async function deleteCompany(id: number) {
  // admins, agents, devices and call_logs all cascade via company_id FK.
  const rows = await AppDataSource.query("DELETE FROM companies WHERE id = $1 RETURNING id", [id]);
  if (rows.length === 0) throw notFound("Company not found");
  return { ok: true };
}

export { updateCompany, regenerateClientCode };

export async function exportCompaniesRows(q: string) {
  const params: unknown[] = [TIME_ZONE];
  let where = "true";
  if (q) {
    params.push(`%${q}%`);
    where = `(c.name ILIKE $2 OR c.client_code ILIKE $2 OR COALESCE(a.email, '') ILIKE $2)`;
  }
  return AppDataSource.query(
    `SELECT c.name, c.client_code, c.plan,
       (SELECT a.email FROM admins a WHERE a.company_id = c.id ORDER BY a.id LIMIT 1) AS admin_email,
       (SELECT count(*)::int FROM agents ag WHERE ag.company_id = c.id) AS agents,
       (SELECT count(*)::int FROM call_logs cl WHERE cl.company_id = c.id) AS calls,
       to_char(c.created_at AT TIME ZONE $1, 'YYYY-MM-DD HH24:MI:SS') AS created
     FROM companies c
     LEFT JOIN LATERAL (SELECT email FROM admins WHERE company_id = c.id ORDER BY id LIMIT 1) a ON true
     WHERE ${where}
     ORDER BY c.created_at DESC`,
    params,
  );
}

export async function exportAgentsRows(company: string, q: string) {
  const params: unknown[] = [TIME_ZONE];
  const where = ["true"];
  if (company) {
    params.push(Number(company));
    where.push(`a.company_id = $${params.length}`);
  }
  if (q) {
    params.push(`%${q}%`);
    where.push(`(a.name ILIKE $${params.length} OR a.username ILIKE $${params.length} OR c.name ILIKE $${params.length})`);
  }
  return AppDataSource.query(
    `SELECT c.name AS company, a.name, a.username, a.phone, a.active,
       to_char((SELECT max(d.last_sync_at) FROM devices d WHERE d.agent_id = a.id AND NOT d.revoked) AT TIME ZONE $1, 'YYYY-MM-DD HH24:MI:SS') AS last_sync
     FROM agents a JOIN companies c ON c.id = a.company_id
     WHERE ${where.join(" AND ")}
     ORDER BY c.name, a.name`,
    params,
  );
}

export { platformExportCallsRows, platformListCalls };
export type { CallFilters };
