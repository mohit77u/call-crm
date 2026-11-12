import Link from "next/link";
import { requireSuperadmin, getPlatformToken } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { formatDateTime } from "@/lib/calls";
import { planDisplayName } from "@/lib/plans";
import { deleteCompany } from "./companies/actions";
import { DeleteCompanyButton } from "./companies/delete-company-button";

export const metadata = { title: "Companies" };


type CompanyRow = {
  id: number;
  name: string;
  client_code: string;
  plan: string | null;
  created_at: string;
  admin_email: string | null;
  agents: number;
  calls: number;
};

export default async function AdminCompaniesPage({ searchParams }: PageProps<"/admin">) {
  await requireSuperadmin();
  const sp = await searchParams;
  const { error, notice } = sp;
  const q = String(Array.isArray(sp.q) ? sp.q[0] : sp.q ?? "").trim().slice(0, 60);
  const data = await apiFetch<{ totals: { companies: number; agents: number; calls: number } | null; companies: CompanyRow[] }>(
    `/api/admin/overview${q ? `?q=${encodeURIComponent(q)}` : ""}`,
    { token: await getPlatformToken() },
  );
  const t = data.totals ?? { companies: 0, agents: 0, calls: 0 };
  const csvQs = q ? `q=${encodeURIComponent(q)}` : "";

  return (
    <>
      <div className="page-head"><div><h1>Companies</h1><p className="page-sub">All customer workspaces, plans and usage</p></div></div>
      {typeof error === "string" && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}
      {typeof notice === "string" && <div className="notice">{notice}</div>}
      <div className="stats">
        <div className="stat"><div className="label">Companies</div><div className="value">{t.companies}</div></div>
        <div className="stat"><div className="label">Agents</div><div className="value">{t.agents}</div></div>
        <div className="stat"><div className="label">Call logs</div><div className="value">{t.calls}</div></div>
      </div>
      <form className="filters card">
        <label>Search<input name="q" defaultValue={q} placeholder="Name, client code, email" /></label>
        <button type="submit">Apply</button>
        <a className="btn secondary" href={`/api/admin/companies/export${csvQs ? `?${csvQs}` : ""}`}>Export CSV</a>
        <Link className="btn" href="/admin/companies/new">+ New company</Link>
      </form>
      <div className="card">
        <table>
          <thead>
            <tr><th>Company</th><th>Plan</th><th>Client code</th><th>Admin email</th><th>Agents</th><th>Calls</th><th>Created</th><th></th></tr>
          </thead>
          <tbody>
            {data.companies.map((c) => (
              <tr key={c.id}>
                <td><a href={`/admin/companies/${c.id}`}>{c.name}</a></td>
                <td><span className="badge other">{planDisplayName(c.plan)}</span></td>
                <td className="muted">{c.client_code}</td>
                <td>{c.admin_email ?? "-"}</td>
                <td><a href={`/admin/agents?company=${c.id}`}>{c.agents}</a></td>
                <td><a href={`/admin/calls?company=${c.id}`}>{c.calls}</a></td>
                <td className="muted">{formatDateTime(c.created_at)}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <Link className="btn secondary" href={`/admin/companies/${c.id}`} style={{ padding: "5px 12px", fontSize: 12.5 }}>Edit</Link>{" "}
                  <DeleteCompanyButton action={deleteCompany.bind(null, c.id)} companyName={c.name} />
                </td>
              </tr>
            ))}
            {data.companies.length === 0 && <tr><td colSpan={8} className="muted">No companies match.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
