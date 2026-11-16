import { NextRequest } from "next/server";
import { apiFetch } from "@/lib/api";
import { getAgentToken, requireAgent } from "@/lib/auth";

export async function POST(req: NextRequest) {
  await requireAgent();
  const body = await req.json().catch(() => ({}));
  return Response.json(await apiFetch("/api/agent/notifications/read", { body, token: await getAgentToken() }));
}
