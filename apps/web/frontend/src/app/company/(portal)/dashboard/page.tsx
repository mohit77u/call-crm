import { cookies } from "next/headers";
import { requireAdmin, getAdminToken, hasFeature } from "@/lib/auth";
import { apiFetch, ApiError } from "@/lib/api";
import { formatDateTime, formatMinutes, todayInZone } from "@/lib/calls";
import { CallsBarChart, StatusDonut } from "./charts";
import { PeriodPills } from "./period-pills";
import { AgentCallsLink } from "./agent-calls-link";

export const metadata = { title: "Dashboard" };

type Totals = { total: number; connected: number; not_connected: number; received: number; missed: number; talk_sec: number };
type AgentRow = Totals & { id: number; name: string; last_sync_at: string | null; location: { lat: number; lng: number; at: string | null } | null };
type DashboardData = { totals: Totals | null; prev: Totals | null; daily: { day: string; total: number }[]; agents: AgentRow[] };

const DAY_OPTIONS = [7, 15, 30];

function addDays(dateStr: string, n: number) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function trend(cur: number, prev: number) {
  if (prev === 0) return cur > 0 ? { text: "new", up: true } : null;
  const pct = Math.round(((cur - prev) / prev) * 100);
  return { text: `${pct > 0 ? "+" : ""}${pct}%`, up: pct >= 0 };
}

export default async function Dashboard() {
  const admin = await requireAdmin();
  const store = await cookies();
  const daysParam = Number(store.get("crm_dashboard_days")?.value);
  const days = DAY_OPTIONS.includes(daysParam) ? daysParam : 7;
  const to = todayInZone();
  const from = addDays(to, -(days - 1));
  const canExport = hasFeature(admin, "exports");
  const canLocation = hasFeature(admin, "locations");

  if (!hasFeature(admin, "reports")) {
    return (
      <>
        <div className="page-head"><div><h1>Dashboard</h1><p className="page-sub">Call performance overview</p></div></div>
        <div className="card"><p className="muted">Reports are not enabled for your plan. Contact support to upgrade.</p></div>
      </>
    );
  }

  let data: DashboardData;
  try {
    data = await apiFetch<DashboardData>(`/api/crm/dashboard?from=${from}&to=${to}`, { token: await getAdminToken() });
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) {
      return (
        <>
          <div className="page-head"><div><h1>Dashboard</h1><p className="page-sub">Call performance overview</p></div></div>
          <div className="card"><p className="muted">Reports are not enabled for your plan. Contact support to upgrade.</p></div>
        </>
      );
    }
    throw e;
  }

  const t = data.totals ?? { total: 0, connected: 0, not_connected: 0, received: 0, missed: 0, talk_sec: 0 };
  const p = data.prev ?? { total: 0, connected: 0, not_connected: 0, received: 0, missed: 0, talk_sec: 0 };
  const connRate = t.total ? Math.round(((t.connected + t.received) / t.total) * 100) : 0;
  const prevConnRate = p.total ? Math.round(((p.connected + p.received) / p.total) * 100) : 0;

  const kpis: { label: string; value: string | number; tr?: ReturnType<typeof trend>; icon: string }[] = [
    { label: "Total calls", value: t.total, tr: trend(t.total, p.total), icon: "📞" },
    { label: "Connected rate", value: `${connRate}%`, tr: trend(connRate, prevConnRate), icon: "📈" },
    { label: "Connected calls", value: t.connected, tr: trend(t.connected, p.connected), icon: "✅" },
    { label: "Missed / rejected", value: t.missed, tr: trend(t.missed, p.missed), icon: "📵" },
    { label: "Talk time", value: formatMinutes(t.talk_sec), tr: trend(t.talk_sec, p.talk_sec), icon: "⏱" },
    { label: "Agents", value: data.agents.length, icon: "👥" },
  ];

  const statusParts = [
    { name: "Connected", value: t.connected, color: "#22c55e" },
    { name: "Received", value: t.received, color: "#3b82f6" },
    { name: "Missed / other", value: t.total - t.connected - t.received, color: "#f59e0b" },
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p className="page-sub">{from} → {to} · compared with previous {days} days</p>
        </div>
        <div className="page-actions">
          <PeriodPills days={days} />
          {canExport && <a className="btn secondary" href={`/api/calls/export?from=${from}&to=${to}`}>Export CSV</a>}
        </div>
      </div>

      <div className="stats">
        {kpis.map((k) => (
          <div className="stat" key={k.label}>
            <div className="label"><span className="kpi-ico">{k.icon}</span>{k.label}</div>
            <div className="value">{k.value}</div>
            {k.tr && <div className={`trend ${k.tr.up ? "up" : "down"}`}>{k.tr.up ? "▲" : "▼"} {k.tr.text} vs prev</div>}
          </div>
        ))}
      </div>

      <div className="dash-grid">
        <div className="card">
          <h2>Calls per day</h2>
          {data.daily.length === 0 ? <p className="muted">No calls in this period.</p> : <CallsBarChart data={data.daily} />}
        </div>
        <div className="card">
          <h2>Call status</h2>
          {t.total === 0 ? <p className="muted">No calls in this period.</p> : <StatusDonut data={statusParts} />}
        </div>
      </div>

      <div className="card">
        <h2>Agent leaderboard</h2>
        <table>
          <thead>
            <tr><th>Agent</th><th>Total</th><th>Connected</th><th>Not connected</th><th>Received</th><th>Missed</th><th>Talk time</th><th>Last sync</th>{canLocation && <th>Location</th>}</tr>
          </thead>
          <tbody>
            {data.agents.map((a) => (
              <tr key={a.id}>
                <td><AgentCallsLink agentId={a.id} name={a.name} from={from} to={to} /></td>
                <td>{a.total}</td><td>{a.connected}</td><td>{a.not_connected}</td><td>{a.received}</td><td>{a.missed}</td>
                <td>{formatMinutes(a.talk_sec)}</td>
                <td className="muted">{a.last_sync_at ? formatDateTime(a.last_sync_at) : "Never"}</td>
                {canLocation && (
                  <td>
                    {a.location ? (
                      <a href={`https://maps.google.com/?q=${a.location.lat},${a.location.lng}`} target="_blank" rel="noreferrer" className="muted">
                        {a.location.lat.toFixed(4)}, {a.location.lng.toFixed(4)}
                      </a>
                    ) : <span className="muted">-</span>}
                  </td>
                )}
              </tr>
            ))}
            {data.agents.length === 0 && <tr><td colSpan={canLocation ? 9 : 8} className="muted">No agents yet. Add them on the Agents page.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
