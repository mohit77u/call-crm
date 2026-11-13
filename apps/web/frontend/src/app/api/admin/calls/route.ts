import { NextRequest } from "next/server";
import { apiFetch } from "@/lib/api";
import { getPlatformToken, requireSuperadmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  await requireSuperadmin();
  const qs = req.nextUrl.searchParams.toString();
  return Response.json(await apiFetch(`/api/admin/calls${qs ? `?${qs}` : ""}`, { token: await getPlatformToken() }));
}
