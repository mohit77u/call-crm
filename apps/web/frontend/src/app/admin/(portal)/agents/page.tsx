import { requireSuperadmin, getPlatformToken } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { AgentsBrowser, type AgentRow } from "./agents-browser";

export const metadata = { title: "Agents" };

export default async function AdminAgentsPage() {
  await requireSuperadmin();
  const data = await apiFetch<{ agents: AgentRow[]; companies: { id: number; name: string }[] }>(
    "/api/admin/agents",
    { token: await getPlatformToken() },
  );

  return (
    <>
      <div className="page-head"><div><h1>Agents</h1><p className="page-sub">Agents across all companies</p></div></div>
      <AgentsBrowser agents={data.agents} companies={data.companies} />
    </>
  );
}
