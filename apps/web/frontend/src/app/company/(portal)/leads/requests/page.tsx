import { requireAdmin, getAdminToken } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { LeadRequestsBrowser } from "./requests-browser";

export const metadata = { title: "Lead requests" };

type AgentOption = { id: number; name: string; active?: boolean };

export default async function LeadRequestsPage() {
  await requireAdmin();
  let agents: AgentOption[] = [];
  try {
    const res = await apiFetch<{ agents: AgentOption[] }>("/api/crm/agents", { token: await getAdminToken() });
    agents = (res.agents ?? []).filter((a) => a.active !== false);
  } catch {
    agents = [];
  }
  return <LeadRequestsBrowser agents={agents} />;
}
