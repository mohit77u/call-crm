import { apiFetch } from "@/lib/api";
import { getAdminToken, requireAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  await requireAdmin();
  const qs = new URL(req.url).searchParams.toString();
  return Response.json(await apiFetch(`/api/crm/clients${qs ? `?${qs}` : ""}`, { token: await getAdminToken() }));
}
