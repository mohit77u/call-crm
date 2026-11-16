import { apiFetch } from "@/lib/api";
import { getPlatformToken } from "@/lib/auth";

export async function POST(req: Request) {
  const token = await getPlatformToken();
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json(await apiFetch("/api/admin/password", { method: "POST", body: await req.json(), token }));
}
