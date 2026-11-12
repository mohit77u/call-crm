import { getAdminToken } from "@/lib/auth";
import { apiFetchRaw } from "@/lib/api";

export async function GET(req: Request) {
  const token = await getAdminToken();
  if (!token) return new Response("Unauthorized", { status: 401 });
  const upstream = await apiFetchRaw(`/api/crm/calls/export?${new URL(req.url).searchParams}`, token);
  if (!upstream.ok) {
    const body = await upstream.json().catch(() => ({ error: "Export failed" }));
    return Response.json(body, { status: upstream.status });
  }
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "text/csv; charset=utf-8",
      "content-disposition": upstream.headers.get("content-disposition") ?? "attachment",
    },
  });
}
