import { requireAdmin } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { buildCallWhere, filtersToQuery, parseCallFilters } from "@/lib/callFilters";
import { STATUSES, STATUS_LABELS, formatDateTime, formatDuration, formatMinutes, type CallStatus } from "@/lib/calls";

const PAGE_SIZE = 100;

type CallRow = { id: string; agent: string; phone_number: string; contact_name: string | null; call_type: string; status: CallStatus; started_at: Date; duration_sec: number };

export default async function CallsPage({ searchParams }: PageProps<"/calls">) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const f = parseCallFilters(sp);
  const page = Math.max(1, Number(Array.isArray(sp.page) ? sp.page[0] : sp.page) || 1);
  const { where, params } = buildCallWhere(admin.companyId, f);

  const agents = await query<{ id: number; name: string }>("SELECT id, name FROM agents WHERE company_id = $1 ORDER BY name", [admin.companyId]);
  const summary = await queryOne<{ total: number; talk_sec: number }>(
    `SELECT count(*)::int AS total, COALESCE(sum(duration_sec), 0)::int AS talk_sec FROM call_logs cl WHERE ${where}`,
    params,
  );
  const calls = await query<CallRow>(
    `SELECT cl.id, a.name AS agent, cl.phone_number, cl.contact_name, cl.call_type, cl.status, cl.started_at, cl.duration_sec
     FROM call_logs cl JOIN agents a ON a.id = cl.agent_id
     WHERE ${where} ORDER BY cl.started_at DESC LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`,
    params,
  );
  const qs = filtersToQuery(f);
  const pages = Math.max(1, Math.ceil(summary!.total / PAGE_SIZE));

  return (
    <>
      <h1>Call logs</h1>
      <form className="filters card">
        <label>From<input type="date" name="from" defaultValue={f.from} /></label>
        <label>To<input type="date" name="to" defaultValue={f.to} /></label>
        <label>Agent
          <select name="agent" defaultValue={f.agent}>
            <option value="">All</option>
            {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>
        <label>Status
          <select name="status" defaultValue={f.status}>
            <option value="">All</option>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </label>
        <label>Number / name<input name="q" defaultValue={f.q} placeholder="Search" /></label>
        <button type="submit">Apply</button>
        <a className="btn secondary" href={`/api/calls/export?${qs}`}>Export CSV</a>
      </form>
      <div className="card">
        <p className="muted">{summary!.total} calls, {formatMinutes(summary!.talk_sec)} talk time</p>
        <table>
          <thead>
            <tr><th>Time</th><th>Agent</th><th>Number</th><th>Name</th><th>Type</th><th>Status</th><th>Duration</th></tr>
          </thead>
          <tbody>
            {calls.map((c) => (
              <tr key={c.id}>
                <td>{formatDateTime(c.started_at)}</td>
                <td>{c.agent}</td>
                <td>{c.phone_number}</td>
                <td className="muted">{c.contact_name ?? "-"}</td>
                <td>{c.call_type}</td>
                <td><span className={`badge ${c.status}`}>{STATUS_LABELS[c.status]}</span></td>
                <td>{formatDuration(c.duration_sec)}</td>
              </tr>
            ))}
            {calls.length === 0 && <tr><td colSpan={7} className="muted">No calls for these filters.</td></tr>}
          </tbody>
        </table>
        {pages > 1 && (
          <div className="pager">
            {page > 1 && <a href={`/calls?${qs}&page=${page - 1}`}>Previous</a>}
            <span className="muted">Page {page} of {pages}</span>
            {page < pages && <a href={`/calls?${qs}&page=${page + 1}`}>Next</a>}
          </div>
        )}
      </div>
    </>
  );
}
