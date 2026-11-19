import { ApiError } from "@/lib/api";
import { getAgentToken, requireAgent } from "@/lib/auth";

const API_URL = (process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "");

export async function POST(req: Request) {
  await requireAgent();
  const token = await getAgentToken();
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const qs = new URL(req.url).searchParams.toString();
  const body = await req.arrayBuffer();
  try {
    const res = await fetch(`${API_URL}/api/agent/clients/import-file${qs ? `?${qs}` : ""}`, {
      method: "POST",
      headers: { "content-type": "application/octet-stream", authorization: `Bearer ${token}` },
      body,
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    return Response.json(data, { status: res.status });
  } catch (e) {
    if (e instanceof ApiError) return Response.json({ error: e.message }, { status: e.status });
    return Response.json({ error: "Import failed" }, { status: 500 });
  }
}
