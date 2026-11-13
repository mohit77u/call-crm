import { NextRequest } from "next/server";
import { apiFetchRaw } from "@/lib/api";
import { getAdminToken, requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  await requireAdmin();
  const qs = req.nextUrl.searchParams.toString();
  const upstream = await apiFetchRaw(`/api/crm/leads/export${qs ? `?${qs}` : ""}`, await getAdminToken());
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "text/csv",
      "content-disposition": upstream.headers.get("content-disposition") ?? "attachment",
    },
  });
}
