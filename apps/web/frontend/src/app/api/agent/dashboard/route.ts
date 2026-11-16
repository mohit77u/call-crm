import { apiFetch } from "@/lib/api";
import { getAgentToken, requireAgent } from "@/lib/auth";

export async function GET(req: Request) {
  await requireAgent();
  const qs = new URL(req.url).searchParams.toString();
  return Response.json(await apiFetch(`/api/agent/dashboard${qs ? `?${qs}` : ""}`, { token: await getAgentToken() }));
}
