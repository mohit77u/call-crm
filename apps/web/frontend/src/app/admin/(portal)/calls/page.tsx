import { requireSuperadmin } from "@/lib/auth";
import { STATUSES } from "@/lib/calls";
import { CallsBrowser } from "./calls-browser";

export const metadata = { title: "Call Logs" };

function param(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function AdminCallsPage({ searchParams }: PageProps<"/admin/calls">) {
  await requireSuperadmin();
  const sp = await searchParams;
  const initialFilters: { from?: string; to?: string; company?: string; agent?: string; status?: string; q?: string } = {};
  const from = param(sp.from);
  const to = param(sp.to);
  const company = param(sp.company);
  const agent = param(sp.agent);
  const status = param(sp.status);
  const q = param(sp.q);
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) initialFilters.from = from;
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) initialFilters.to = to;
  if (company && /^\d+$/.test(company)) initialFilters.company = company;
  if (agent && /^\d+$/.test(agent)) initialFilters.agent = agent;
  if (status && (STATUSES as readonly string[]).includes(status)) initialFilters.status = status;
  if (q) initialFilters.q = q.slice(0, 100);
  return (
    <>
      <div className="page-head"><div><h1>Call Logs</h1><p className="page-sub">Calls across all companies</p></div></div>
      <CallsBrowser key={JSON.stringify(initialFilters)} initialFilters={initialFilters} />
    </>
  );
}
