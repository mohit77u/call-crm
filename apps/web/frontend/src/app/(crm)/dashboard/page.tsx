import { requireAdmin, getAdminToken, hasFeature } from "@/lib/auth";
import { apiFetch, ApiError } from "@/lib/api";
import { parseCallFilters } from "@/lib/callFilters";
import { formatDateTime, formatMinutes } from "@/lib/calls";

export const metadata = { title: "Dashboard" };


type Totals = { total: number; connected: number; not_connected: number; received: number; missed: number; talk_sec: number };
type AgentRow = Totals & { id: number; name: string; last_sync_at: string | null };

export default async function Dashboard({ searchParams }: PageProps<"/dashboard">) {
  const admin = await requireAdmin();
  const f = parseCallFilters(await searchParams);
  if (!hasFeature(admin, "reports")) {
    return (
      <>
        <h1>Dashboard</h1>
        <div className="card"><p className="muted">Reports are not enabled for your plan. Contact support to upgrade.</p></div>
      </>
    );
  }
  const qs = new URLSearchParams({ from: f.from, to: f.to }).toString();
  let data: { totals: Totals | null; agents: AgentRow[] };
  try {
    data = await apiFetch(`/api/crm/dashboard?${qs}`, { token: await getAdminToken() });
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) {
      return (
        <>
          <h1>Dashboard</h1>
          <div className="card"><p className="muted">Reports are not enabled for your plan. Contact support to upgrade.</p></div>
        </>
      );
    }
    throw e;
  }
  const t = data.totals ?? { total: 0, connected: 0, not_connected: 0, received: 0, missed: 0, talk_sec: 0 };
  const stats = [
    ["Total calls", t.total],
    ["Connected (out)", t.connected],
    ["Not connected", t.not_connected],
    ["Received (in)", t.received],
    ["Missed / rejected", t.missed],
    ["Talk time", formatMinutes(t.talk_sec)],
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p className="page-sub">Call performance overview{f.from || f.to ? " for selected period" : " — all time"}</p>
        </div>
      </div>
      <form className="filters card">
        <label>From<input type="date" name="from" defaultValue={f.from} /></label>
        <label>To<input type="date" name="to" defaultValue={f.to} /></label>
        <button type="submit">Apply</button>
      </form>
      <div className="stats">
        {stats.map(([label, value]) => (
          <div className="stat" key={label}>
            <div className="label">{label}</div>
            <div className="value">{value}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <h2>Agents</h2>
        <table>
          <thead>
            <tr><th>Agent</th><th>Total</th><th>Connected</th><th>Not connected</th><th>Received</th><th>Missed</th><th>Talk time</th><th>Last sync</th></tr>
          </thead>
          <tbody>
            {data.agents.map((a) => (
              <tr key={a.id}>
                <td><a href={`/calls?agent=${a.id}&from=${f.from}&to=${f.to}`}>{a.name}</a></td>
                <td>{a.total}</td><td>{a.connected}</td><td>{a.not_connected}</td><td>{a.received}</td><td>{a.missed}</td>
                <td>{formatMinutes(a.talk_sec)}</td>
                <td className="muted">{a.last_sync_at ? formatDateTime(a.last_sync_at) : "Never"}</td>
              </tr>
            ))}
            {data.agents.length === 0 && <tr><td colSpan={8} className="muted">No agents yet. Add them on the Agents page.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
