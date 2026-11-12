import { AppDataSource } from "../../database";
import { TIME_ZONE, type CallStatus } from "../../shared/calls";
import { buildCompanyCallWhere, buildPlatformCallWhere, parseCallFilters, type CallFilters } from "./call-filters";

const PAGE_SIZE = 100;

const SUMS = `
  count(cl.id)::int AS total,
  count(*) FILTER (WHERE cl.status = 'connected')::int AS connected,
  count(*) FILTER (WHERE cl.status = 'not_connected')::int AS not_connected,
  count(*) FILTER (WHERE cl.status = 'received')::int AS received,
  count(*) FILTER (WHERE cl.status IN ('missed', 'rejected'))::int AS missed,
  COALESCE(sum(cl.duration_sec), 0)::int AS talk_sec`;

export async function dashboard(companyId: number, f: CallFilters) {
  const { where, params } = buildCompanyCallWhere(companyId, { ...f, agent: "", status: "", q: "" });
  const totals = await AppDataSource.query(`SELECT ${SUMS} FROM call_logs cl WHERE ${where}`, params);
  const agents = await AppDataSource.query(
    `SELECT a.id, a.name, ${SUMS},
       (SELECT max(d.last_sync_at) FROM devices d WHERE d.agent_id = a.id AND NOT d.revoked) AS last_sync_at
     FROM agents a
     LEFT JOIN call_logs cl ON cl.agent_id = a.id AND ${where}
     WHERE a.company_id = $1
     GROUP BY a.id ORDER BY talk_sec DESC, a.name`,
    params,
  );
  return { totals: totals[0] ?? null, agents };
}

export async function listCalls(companyId: number, f: CallFilters, page: number) {
  const { where, params } = buildCompanyCallWhere(companyId, f);
  const agents = await AppDataSource.query("SELECT id, name FROM agents WHERE company_id = $1 ORDER BY name", [companyId]);
  const summary = await AppDataSource.query(
    `SELECT count(*)::int AS total, COALESCE(sum(duration_sec), 0)::int AS talk_sec FROM call_logs cl WHERE ${where}`,
    params,
  );
  const total = summary[0]?.total ?? 0;
  const talkSec = summary[0]?.talk_sec ?? 0;
  const calls = await AppDataSource.query(
    `SELECT cl.id, a.name AS agent, cl.phone_number, cl.contact_name, cl.call_type, cl.status, cl.started_at, cl.duration_sec
     FROM call_logs cl JOIN agents a ON a.id = cl.agent_id
     WHERE ${where} ORDER BY cl.started_at DESC LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`,
    params,
  );
  return {
    agents,
    summary: { total, talkSec },
    calls,
    page,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function exportCallsRows(companyId: number, f: CallFilters) {
  const { where, params } = buildCompanyCallWhere(companyId, f);
  params.push(TIME_ZONE);
  return AppDataSource.query(
    `SELECT to_char(cl.started_at AT TIME ZONE $${params.length}, 'YYYY-MM-DD HH24:MI:SS') AS started, a.name AS agent,
       cl.phone_number, cl.contact_name, cl.call_type, cl.status, cl.duration_sec
     FROM call_logs cl JOIN agents a ON a.id = cl.agent_id
     WHERE ${where} ORDER BY cl.started_at DESC`,
    params,
  );
}

export async function platformListCalls(f: CallFilters, page: number) {
  const { where, params } = buildPlatformCallWhere(f);
  const companies = await AppDataSource.query("SELECT id, name FROM companies ORDER BY name");
  const agents = await AppDataSource.query(
    f.company
      ? "SELECT id, name FROM agents WHERE company_id = $1 ORDER BY name"
      : "SELECT id, name FROM agents ORDER BY name",
    f.company ? [Number(f.company)] : [],
  );
  const summary = await AppDataSource.query(
    `SELECT count(*)::int AS total, COALESCE(sum(duration_sec), 0)::int AS talk_sec FROM call_logs cl WHERE ${where}`,
    params,
  );
  const total = summary[0]?.total ?? 0;
  const talkSec = summary[0]?.talk_sec ?? 0;
  const calls = await AppDataSource.query(
    `SELECT cl.id, c.name AS company, a.name AS agent, cl.phone_number, cl.contact_name, cl.call_type, cl.status, cl.started_at, cl.duration_sec
     FROM call_logs cl
     JOIN agents a ON a.id = cl.agent_id
     JOIN companies c ON c.id = cl.company_id
     WHERE ${where} ORDER BY cl.started_at DESC LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`,
    params,
  );
  return {
    companies,
    agents,
    summary: { total, talkSec },
    calls,
    page,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function platformExportCallsRows(f: CallFilters) {
  const { where, params } = buildPlatformCallWhere(f);
  params.push(TIME_ZONE);
  return AppDataSource.query(
    `SELECT to_char(cl.started_at AT TIME ZONE $${params.length}, 'YYYY-MM-DD HH24:MI:SS') AS started,
       c.name AS company, a.name AS agent, cl.phone_number, cl.contact_name, cl.call_type, cl.status, cl.duration_sec
     FROM call_logs cl
     JOIN agents a ON a.id = cl.agent_id
     JOIN companies c ON c.id = cl.company_id
     WHERE ${where} ORDER BY cl.started_at DESC`,
    params,
  );
}

export function parsePage(query: Record<string, unknown>) {
  return Math.max(1, Number(Array.isArray(query.page) ? query.page[0] : query.page) || 1);
}

export type { CallFilters, CallStatus };
