import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSuperadmin, getPlatformToken } from "@/lib/auth";
import { apiFetch, ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/calls";
import { planDisplayName } from "@/lib/plans";
import { CompanyEditForm } from "../company-edit-form";
import { RegenerateCodeButton } from "../regenerate-code-button";

export const metadata = { title: "Company details" };


type CompanyDetail = {
  company: {
    id: number;
    name: string;
    clientCode: string;
    features: Record<string, unknown>;
    plan: string | null;
    createdAt: string;
  };
  admins: { id: number; name: string; email: string; createdAt: string }[];
  counts: { agents: number; calls: number; devices: number } | null;
};

export default async function CompanyDetailPage({ params }: PageProps<"/admin/companies/[id]">) {
  await requireSuperadmin();
  const { id } = await params;
  let data: CompanyDetail;
  try {
    data = await apiFetch<CompanyDetail>(`/api/admin/companies/${id}`, { token: await getPlatformToken() });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  const { company, admins, counts } = data;

  return (
    <>
      <p><Link href="/admin/companies">&larr; Companies</Link></p>
      <h1>{company.name} <span className="badge other" style={{ verticalAlign: "middle" }}>{planDisplayName(company.plan)}</span></h1>

      <div className="stats">
        <div className="stat"><div className="label">Agents</div><div className="value">{counts?.agents ?? 0}</div></div>
        <div className="stat"><div className="label">Devices</div><div className="value">{counts?.devices ?? 0}</div></div>
        <div className="stat"><div className="label">Call logs</div><div className="value">{counts?.calls ?? 0}</div></div>
        <div className="stat"><div className="label">Created</div><div className="value" style={{ fontSize: 14 }}>{formatDateTime(company.createdAt)}</div></div>
      </div>

      <CompanyEditForm
        companyId={company.id}
        name={company.name}
        plan={company.plan}
        features={company.features}
      />

      <div className="card">
        <h2>Client code</h2>
        <div className="code">{company.clientCode}</div>
        <div style={{ marginTop: 12 }}>
          <RegenerateCodeButton companyId={company.id} />
          <span className="muted" style={{ marginLeft: 8 }}>Existing logged-in phones stay connected.</span>
        </div>
      </div>

      <div className="card">
        <h2>Admins</h2>
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Created</th></tr></thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.id}>
                <td>{a.name}</td>
                <td>{a.email}</td>
                <td className="muted">{formatDateTime(a.createdAt)}</td>
              </tr>
            ))}
            {admins.length === 0 && <tr><td colSpan={3} className="muted">No admins.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
