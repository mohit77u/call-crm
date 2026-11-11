import { requireAdmin } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { buildCallWhere, parseCallFilters } from "@/lib/callFilters";
import { formatDateTime, formatMinutes } from "@/lib/calls";

type Totals = { total: number; connected: number; not_connected: number; received: number; missed: number; talk_sec: number };
type AgentRow = Totals & { id: number; name: string; last_sync_at: Date | null };

const SUMS = `
  count(cl.id)::int AS total,
  count(*) FILTER (WHERE cl.status = 'connected')::int AS connected,
  count(*) FILTER (WHERE cl.status = 'not_connected')::int AS not_connected,
  count(*) FILTER (WHERE cl.status = 'received')::int AS received,
  count(*) FILTER (WHERE cl.status IN ('missed', 'rejected'))::int AS missed,
  COALESCE(sum(cl.duration_sec), 0)::int AS talk_sec`;

export default async function Dashboard({ searchParams }: PageProps<"/dashboard">) {
  const admin = await requireAdmin();
  const f = parseCallFilters(await searchParams);
  const { where, params } = buildCallWhere(admin.companyId, { ...f, agent: "", status: "", q: "" });

  const totals = await queryOne<Totals>(`SELECT ${SUMS} FROM call_logs cl WHERE ${where}`, params);
  const agents = await query<AgentRow>(
    `SELECT a.id, a.name, ${SUMS},
       (SELECT max(d.last_sync_at) FROM devices d WHERE d.agent_id = a.id AND NOT d.revoked) AS last_sync_at
     FROM agents a
     LEFT JOIN call_logs cl ON cl.agent_id = a.id AND ${where}
     WHERE a.company_id = $1
     GROUP BY a.id ORDER BY talk_sec DESC, a.name`,
    params,
  );
  const t = totals!;
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
      <h1>Dashboard</h1>
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
            {agents.map((a) => (
              <tr key={a.id}>
                <td><a href={`/calls?agent=${a.id}&from=${f.from}&to=${f.to}`}>{a.name}</a></td>
                <td>{a.total}</td><td>{a.connected}</td><td>{a.not_connected}</td><td>{a.received}</td><td>{a.missed}</td>
                <td>{formatMinutes(a.talk_sec)}</td>
                <td className="muted">{a.last_sync_at ? formatDateTime(a.last_sync_at) : "Never"}</td>
              </tr>
            ))}
            {agents.length === 0 && <tr><td colSpan={8} className="muted">No agents yet. Add them on the Agents page.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
