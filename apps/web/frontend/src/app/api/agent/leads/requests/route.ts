import { apiFetch } from "@/lib/api";
import { getAgentToken, requireAgent } from "@/lib/auth";

export async function GET() {
  await requireAgent();
  return Response.json(await apiFetch("/api/agent/leads/requests", { token: await getAgentToken() }));
}
