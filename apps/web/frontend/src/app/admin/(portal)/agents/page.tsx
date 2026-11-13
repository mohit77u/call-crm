import { requireSuperadmin, getPlatformToken } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { AgentsBrowser, type AgentRow } from "./agents-browser";

export const metadata = { title: "Agents" };

export default async function AdminAgentsPage({ searchParams }: PageProps<"/admin/agents">) {
  await requireSuperadmin();
  const sp = await searchParams;
  const company = /^\d+$/.test(String(sp.company ?? "")) ? String(sp.company) : "";
  const data = await apiFetch<{ agents: AgentRow[]; companies: { id: number; name: string }[] }>(
    "/api/admin/agents",
    { token: await getPlatformToken() },
  );

  return (
    <>
      <div className="page-head"><div><h1>Agents</h1><p className="page-sub">Agents across all companies</p></div></div>
      <AgentsBrowser agents={data.agents} companies={data.companies} initialCompany={company} />
    </>
  );
}
