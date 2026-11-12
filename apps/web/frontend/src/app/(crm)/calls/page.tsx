import { requireAdmin, getAdminToken, hasFeature } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { parseCallFilters, filtersToQuery } from "@/lib/callFilters";
import { STATUSES, STATUS_LABELS, formatDateTime, formatDuration, formatMinutes, type CallStatus } from "@/lib/calls";

export const metadata = { title: "Call logs" };


type CallRow = { id: string; agent: string; phone_number: string; contact_name: string | null; call_type: string; status: CallStatus; started_at: string; duration_sec: number };
type CallsResponse = {
  agents: { id: number; name: string }[];
  summary: { total: number; talkSec: number };
  calls: CallRow[];
  page: number;
  pages: number;
};

export default async function CallsPage({ searchParams }: PageProps<"/calls">) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const f = parseCallFilters(sp);
  const page = Math.max(1, Number(Array.isArray(sp.page) ? sp.page[0] : sp.page) || 1);
  const params = new URLSearchParams(filtersToQuery(f));
  params.set("page", String(page));
  const data = await apiFetch<CallsResponse>(`/api/crm/calls?${params}`, { token: await getAdminToken() });
  const qs = filtersToQuery(f);
  const canExport = hasFeature(admin, "exports");

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Call logs</h1>
          <p className="page-sub">{data.summary.total} calls · {formatMinutes(data.summary.talkSec)} talk time</p>
        </div>
        {canExport && <div className="page-actions"><a className="btn secondary" href={`/api/calls/export?${qs}`}>Export CSV</a></div>}
      </div>
      <form className="filters card">
        <label>From<input type="date" name="from" defaultValue={f.from} /></label>
        <label>To<input type="date" name="to" defaultValue={f.to} /></label>
        <label>Agent
          <select name="agent" defaultValue={f.agent}>
            <option value="">All</option>
            {data.agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
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
      </form>
      <div className="card">
        <table>
          <thead>
            <tr><th>Time</th><th>Agent</th><th>Number</th><th>Name</th><th>Type</th><th>Status</th><th>Duration</th></tr>
          </thead>
          <tbody>
            {data.calls.map((c) => (
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
            {data.calls.length === 0 && <tr><td colSpan={7} className="muted">No calls for these filters.</td></tr>}
          </tbody>
        </table>
        {data.pages > 1 && (
          <div className="pager">
            {data.page > 1 && <a href={`/calls?${qs}&page=${data.page - 1}`}>Previous</a>}
            <span className="muted">Page {data.page} of {data.pages}</span>
            {data.page < data.pages && <a href={`/calls?${qs}&page=${data.page + 1}`}>Next</a>}
          </div>
        )}
      </div>
    </>
  );
}
