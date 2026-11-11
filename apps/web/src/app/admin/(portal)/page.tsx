import { requireSuperadmin } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { formatDateTime } from "@/lib/calls";

type CompanyRow = {
  id: number;
  name: string;
  client_code: string;
  created_at: Date;
  admin_email: string | null;
  agents: number;
  calls: number;
};

export default async function AdminCompaniesPage({ searchParams }: PageProps<"/admin">) {
  await requireSuperadmin();
  const sp = await searchParams;
  const q = String(Array.isArray(sp.q) ? sp.q[0] : sp.q ?? "").trim().slice(0, 60);
  const params: unknown[] = [];
  let where = "true";
  if (q) {
    params.push(`%${q}%`);
    where = `(c.name ILIKE $1 OR c.client_code ILIKE $1 OR COALESCE(a.email, '') ILIKE $1)`;
  }

  const totals = await queryOne<{ companies: number; agents: number; calls: number }>(
    `SELECT (SELECT count(*)::int FROM companies) AS companies,
            (SELECT count(*)::int FROM agents) AS agents,
            (SELECT count(*)::int FROM call_logs) AS calls`,
  );
  const companies = await query<CompanyRow>(
    `SELECT c.id, c.name, c.client_code, c.created_at,
       (SELECT a.email FROM admins a WHERE a.company_id = c.id ORDER BY a.id LIMIT 1) AS admin_email,
       (SELECT count(*)::int FROM agents ag WHERE ag.company_id = c.id) AS agents,
       (SELECT count(*)::int FROM call_logs cl WHERE cl.company_id = c.id) AS calls
     FROM companies c
     LEFT JOIN LATERAL (SELECT email FROM admins WHERE company_id = c.id ORDER BY id LIMIT 1) a ON true
     WHERE ${where}
     ORDER BY c.created_at DESC`,
    params,
  );
  const t = totals!;
  const csvQs = q ? `q=${encodeURIComponent(q)}` : "";

  return (
    <>
      <h1>Companies</h1>
      <div className="stats">
        <div className="stat"><div className="label">Companies</div><div className="value">{t.companies}</div></div>
        <div className="stat"><div className="label">Agents</div><div className="value">{t.agents}</div></div>
        <div className="stat"><div className="label">Call logs</div><div className="value">{t.calls}</div></div>
      </div>
      <form className="filters card">
        <label>Search<input name="q" defaultValue={q} placeholder="Name, client code, email" /></label>
        <button type="submit">Apply</button>
        <a className="btn secondary" href={`/api/admin/companies/export${csvQs ? `?${csvQs}` : ""}`}>Export CSV</a>
      </form>
      <div className="card">
        <table>
          <thead>
            <tr><th>Company</th><th>Client code</th><th>Admin email</th><th>Agents</th><th>Calls</th><th>Created</th></tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td className="muted">{c.client_code}</td>
                <td>{c.admin_email ?? "-"}</td>
                <td><a href={`/admin/agents?company=${c.id}`}>{c.agents}</a></td>
                <td><a href={`/admin/calls?company=${c.id}`}>{c.calls}</a></td>
                <td className="muted">{formatDateTime(c.created_at)}</td>
              </tr>
            ))}
            {companies.length === 0 && <tr><td colSpan={6} className="muted">No companies match.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
