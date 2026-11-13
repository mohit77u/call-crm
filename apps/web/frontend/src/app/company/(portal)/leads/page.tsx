import { requireAdmin, getAdminToken } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { CrmLeadsBrowser } from "./leads-browser";

export const metadata = { title: "Leads" };

type AgentOption = { id: number; name: string; active?: boolean };

export default async function CrmLeadsPage() {
  await requireAdmin();
  let agents: AgentOption[] = [];
  try {
    const res = await apiFetch<{ agents: AgentOption[] }>("/api/crm/agents", { token: await getAdminToken() });
    agents = res.agents ?? [];
  } catch {
    agents = [];
  }
  return <CrmLeadsBrowser agents={agents} />;
}
