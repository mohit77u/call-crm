import Link from "next/link";
import { requireSuperadmin, getPlatformToken } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  await requireSuperadmin();
  const data = await apiFetch<{ totals: { companies: number; agents: number; calls: number } | null }>(
    "/api/admin/overview",
    { token: await getPlatformToken() },
  );
  const t = data.totals ?? { companies: 0, agents: 0, calls: 0 };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p className="page-sub">Platform overview at a glance</p>
        </div>
      </div>
      <div className="stats">
        <Link href="/admin/companies" className="stat" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="label">Companies</div>
          <div className="value">{t.companies}</div>
        </Link>
        <Link href="/admin/agents" className="stat" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="label">Agents</div>
          <div className="value">{t.agents}</div>
        </Link>
        <Link href="/admin/calls" className="stat" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="label">Call Logs</div>
          <div className="value">{t.calls}</div>
        </Link>
      </div>
    </>
  );
}
