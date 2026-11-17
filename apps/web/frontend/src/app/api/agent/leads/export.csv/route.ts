import { apiFetchRaw } from "@/lib/api";
import { getAgentToken, requireAgent } from "@/lib/auth";

export async function GET(req: Request) {
  await requireAgent();
  const qs = new URL(req.url).search;
  const upstream = await apiFetchRaw(`/api/agent/leads/export.csv${qs}`, await getAgentToken());
  if (!upstream.ok) {
    const body = await upstream.json().catch(() => ({ error: "Download failed" }));
    return Response.json(body, { status: upstream.status });
  }
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "text/csv; charset=utf-8",
      "content-disposition": upstream.headers.get("content-disposition") ?? `attachment; filename="my-leads.csv"`,
    },
  });
}
