import { apiFetchRaw } from "@/lib/api";
import { getAgentToken, requireAgent } from "@/lib/auth";

export async function GET() {
  await requireAgent();
  const upstream = await apiFetchRaw("/api/agent/clients/export.csv", await getAgentToken());
  if (!upstream.ok) {
    const body = await upstream.json().catch(() => ({ error: "Download failed" }));
    return Response.json(body, { status: upstream.status });
  }
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "text/csv; charset=utf-8",
      "content-disposition": upstream.headers.get("content-disposition") ?? `attachment; filename="my-clients.csv"`,
    },
  });
}
