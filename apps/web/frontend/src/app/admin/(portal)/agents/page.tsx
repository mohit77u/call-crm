import { requireSuperadmin, getPlatformToken } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { formatDateTime } from "@/lib/calls";

export const metadata = { title: "Agents" };


type AgentRow = {
  id: number;
  name: string;
  username: string;
  phone: string | null;
  active: boolean;
  company: string;
  company_id: number;
  last_sync_at: string | null;
};

export default async function AdminAgentsPage({ searchParams }: PageProps<"/admin/agents">) {
  await requireSuperadmin();
  const sp = await searchParams;
  const q = String(Array.isArray(sp.q) ? sp.q[0] : sp.q ?? "").trim().slice(0, 60);
  const company = /^\d+$/.test(String(sp.company ?? "")) ? String(sp.company) : "";
  const params = new URLSearchParams();
  if (company) params.set("company", company);
  if (q) params.set("q", q);
  const data = await apiFetch<{ agents: AgentRow[]; companies: { id: number; name: string }[] }>(
    `/api/admin/agents${params.size ? `?${params}` : ""}`,
    { token: await getPlatformToken() },
  );
  const csv = new URLSearchParams();
  if (q) csv.set("q", q);
  if (company) csv.set("company", company);

  return (
    <>
      <div className="page-head"><div><h1>Agents</h1><p className="page-sub">Agents across all companies</p></div></div>
      <form className="filters card">
        <label>Company
          <select name="company" defaultValue={company}>
            <option value="">All</option>
            {data.companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label>Search<input name="q" defaultValue={q} placeholder="Name, username, company" /></label>
        <button type="submit">Apply</button>
        <a className="btn secondary" href={`/api/admin/agents/export?${csv}`}>Export CSV</a>
      </form>
      <div className="card">
        <p className="muted">{data.agents.length} agents</p>
        <table>
          <thead>
            <tr><th>Company</th><th>Name</th><th>Username</th><th>Phone</th><th>Status</th><th>Last sync</th></tr>
          </thead>
          <tbody>
            {data.agents.map((a) => (
              <tr key={a.id}>
                <td>{a.company}</td>
                <td>{a.name}</td>
                <td>{a.username}</td>
                <td>{a.phone ?? "-"}</td>
                <td>{a.active ? "Active" : <span className="muted">Disabled</span>}</td>
                <td className="muted">{a.last_sync_at ? formatDateTime(a.last_sync_at) : "Never"}</td>
              </tr>
            ))}
            {data.agents.length === 0 && <tr><td colSpan={6} className="muted">No agents match.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
