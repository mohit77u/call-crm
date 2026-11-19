import { requireAgent } from "@/lib/auth";
import { AgentLeadsBrowser } from "../leads/leads-browser";

export const metadata = { title: "Active leads" };

export default async function AgentActiveLeadsPage() {
  await requireAgent();
  return <AgentLeadsBrowser mode="active" />;
}
