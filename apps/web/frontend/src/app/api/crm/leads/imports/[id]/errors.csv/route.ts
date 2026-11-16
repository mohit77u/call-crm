import { apiFetchRaw } from "@/lib/api";
import { getAdminToken, requireAdmin } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const upstream = await apiFetchRaw(`/api/crm/leads/imports/${id}/errors.csv`, await getAdminToken());
  if (!upstream.ok) {
    const body = await upstream.json().catch(() => ({ error: "Download failed" }));
    return Response.json(body, { status: upstream.status });
  }
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "text/csv; charset=utf-8",
      "content-disposition": upstream.headers.get("content-disposition") ?? `attachment; filename="import-${id}-errors.csv"`,
    },
  });
}
