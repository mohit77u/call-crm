import { requireAgent } from "@/lib/auth";
import { AgentLeadsBrowser } from "./leads-browser";

export const metadata = { title: "My leads" };

export default async function AgentLeadsPage() {
  await requireAgent();
  return <AgentLeadsBrowser />;
}
