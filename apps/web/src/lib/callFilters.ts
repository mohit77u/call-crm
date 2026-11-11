import { STATUSES, TIME_ZONE, todayInZone, type CallStatus } from "./calls";

export type CallFilters = { from: string; to: string; agent: string; status: string; q: string };

type Params = Record<string, string | string[] | undefined>;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function one(v: string | string[] | undefined) {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export function parseCallFilters(params: Params): CallFilters {
  const today = todayInZone();
  const from = one(params.from);
  const to = one(params.to);
  const status = one(params.status);
  return {
    from: DATE_RE.test(from) ? from : today,
    to: DATE_RE.test(to) ? to : today,
    agent: /^\d+$/.test(one(params.agent)) ? one(params.agent) : "",
    status: STATUSES.includes(status as CallStatus) ? status : "",
    q: one(params.q).trim().slice(0, 30),
  };
}

export function buildCallWhere(companyId: number, f: CallFilters) {
  const params: unknown[] = [companyId, f.from, f.to, TIME_ZONE];
  const where = [
    "cl.company_id = $1",
    "cl.started_at >= ($2::date)::timestamp AT TIME ZONE $4",
    "cl.started_at < ($3::date + 1)::timestamp AT TIME ZONE $4",
  ];
  if (f.agent) {
    params.push(Number(f.agent));
    where.push(`cl.agent_id = $${params.length}`);
  }
  if (f.status) {
    params.push(f.status);
    where.push(`cl.status = $${params.length}`);
  }
  if (f.q) {
    params.push(`%${f.q}%`);
    where.push(`(cl.phone_number ILIKE $${params.length} OR cl.contact_name ILIKE $${params.length})`);
  }
  return { where: where.join(" AND "), params };
}

export function filtersToQuery(f: CallFilters) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v) sp.set(k, v);
  return sp.toString();
}
