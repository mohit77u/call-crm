import { apiFetch } from "@/lib/api";
import { getPlatformToken } from "@/lib/auth";

export async function PATCH(req: Request) {
  const token = await getPlatformToken();
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json(await apiFetch("/api/admin/profile", { method: "PATCH", body: await req.json(), token }));
}
