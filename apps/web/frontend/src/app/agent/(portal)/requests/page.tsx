import { requireAgent } from "@/lib/auth";
import { AgentRequestsBrowser } from "./requests-browser";

export const metadata = { title: "Lead requests" };

export default async function AgentRequestsPage() {
  await requireAgent();
  return <AgentRequestsBrowser />;
}
