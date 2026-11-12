import { STATUSES, todayInZone, type CallStatus } from "./calls";

export type CallFilters = { from: string; to: string; agent: string; status: string; q: string; company: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function one(v: string | string[] | undefined) {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export function parseCallFilters(params: Record<string, string | string[] | undefined>): CallFilters {
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
    company: /^\d+$/.test(one(params.company)) ? one(params.company) : "",
  };
}

export function filtersToQuery(f: CallFilters) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v) sp.set(k, v);
  return sp.toString();
}
