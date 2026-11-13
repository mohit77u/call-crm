import { apiFetch } from "@/lib/api";
import { getAdminToken, requireAdmin } from "@/lib/auth";

export async function GET() {
  await requireAdmin();
  return Response.json(await apiFetch("/api/crm/leads/requests", { token: await getAdminToken() }));
}
