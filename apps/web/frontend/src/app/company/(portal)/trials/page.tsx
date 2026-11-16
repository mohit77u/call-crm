import { requireAdmin, getAdminToken } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { CrmTrialsBrowser } from "./trials-browser";

export const metadata = { title: "Free trial" };

type AgentOption = { id: number; name: string; active?: boolean };

export default async function CrmTrialsPage() {
  await requireAdmin();
  let agents: AgentOption[] = [];
  try {
    const res = await apiFetch<{ agents: AgentOption[] }>("/api/crm/agents", { token: await getAdminToken() });
    agents = res.agents ?? [];
  } catch {
    agents = [];
  }
  return <CrmTrialsBrowser agents={agents} />;
}
