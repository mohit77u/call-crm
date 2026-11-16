import { NextRequest } from "next/server";
import { apiFetch } from "@/lib/api";
import { getAdminToken, requireAdmin } from "@/lib/auth";

export async function PATCH(req: NextRequest) {
  await requireAdmin();
  const body = await req.json().catch(() => ({}));
  return Response.json(await apiFetch("/api/crm/settings/profile", { method: "PATCH", body, token: await getAdminToken() }));
}
