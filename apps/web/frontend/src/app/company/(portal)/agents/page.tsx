import { requireAdmin, getAdminToken } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { AgentsBrowser, type AgentRow, type DeviceRow } from "./agents-browser";

export const metadata = { title: "Agents" };

export default async function AgentsPage() {
  const admin = await requireAdmin();
  const { agents, devices } = await apiFetch<{ agents: AgentRow[]; devices: DeviceRow[] }>("/api/crm/agents", {
    token: await getAdminToken(),
  });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Agents</h1>
          <p className="page-sub">{agents.length} agent{agents.length === 1 ? "" : "s"} · manage access, phones and passwords</p>
        </div>
      </div>
      <AgentsBrowser agents={agents} devices={devices} clientCode={admin.clientCode} />
    </>
  );
}
