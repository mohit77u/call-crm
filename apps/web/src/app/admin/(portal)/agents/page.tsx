import { requireSuperadmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { formatDateTime } from "@/lib/calls";

type AgentRow = {
  id: number;
  name: string;
  username: string;
  phone: string | null;
  active: boolean;
  company: string;
  company_id: number;
  last_sync_at: Date | null;
};

export default async function AdminAgentsPage({ searchParams }: PageProps<"/admin/agents">) {
  await requireSuperadmin();
  const sp = await searchParams;
  const q = String(Array.isArray(sp.q) ? sp.q[0] : sp.q ?? "").trim().slice(0, 60);
  const company = /^\d+$/.test(String(sp.company ?? "")) ? String(sp.company) : "";
  const companies = await query<{ id: number; name: string }>("SELECT id, name FROM companies ORDER BY name");

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

  const agents = await query<AgentRow>(
    `SELECT a.id, a.name, a.username, a.phone, a.active, c.name AS company, a.company_id,
       (SELECT max(d.last_sync_at) FROM devices d WHERE d.agent_id = a.id AND NOT d.revoked) AS last_sync_at
     FROM agents a JOIN companies c ON c.id = a.company_id
     WHERE ${where.join(" AND ")}
     ORDER BY c.name, a.name`,
    params,
  );
  const csv = new URLSearchParams();
  if (q) csv.set("q", q);
  if (company) csv.set("company", company);

  return (
    <>
      <h1>Agents</h1>
      <form className="filters card">
        <label>Company
          <select name="company" defaultValue={company}>
            <option value="">All</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label>Search<input name="q" defaultValue={q} placeholder="Name, username, company" /></label>
        <button type="submit">Apply</button>
        <a className="btn secondary" href={`/api/admin/agents/export?${csv}`}>Export CSV</a>
      </form>
      <div className="card">
        <p className="muted">{agents.length} agents</p>
        <table>
          <thead>
            <tr><th>Company</th><th>Name</th><th>Username</th><th>Phone</th><th>Status</th><th>Last sync</th></tr>
          </thead>
          <tbody>
            {agents.map((a) => (
              <tr key={a.id}>
                <td>{a.company}</td>
                <td>{a.name}</td>
                <td>{a.username}</td>
                <td>{a.phone ?? "-"}</td>
                <td>{a.active ? "Active" : <span className="muted">Disabled</span>}</td>
                <td className="muted">{a.last_sync_at ? formatDateTime(a.last_sync_at) : "Never"}</td>
              </tr>
            ))}
            {agents.length === 0 && <tr><td colSpan={6} className="muted">No agents match.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
