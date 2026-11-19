import { apiFetch } from "@/lib/api";
import { getAdminToken, requireAdmin } from "@/lib/auth";

export async function GET() {
  await requireAdmin();
  return Response.json(await apiFetch("/api/crm/clients/imports", { token: await getAdminToken() }));
}
