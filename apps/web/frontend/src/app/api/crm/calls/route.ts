import { NextRequest } from "next/server";
import { apiFetch } from "@/lib/api";
import { getAdminToken, requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  await requireAdmin();
  const qs = req.nextUrl.searchParams.toString();
  return Response.json(await apiFetch(`/api/crm/calls${qs ? `?${qs}` : ""}`, { token: await getAdminToken() }));
}
