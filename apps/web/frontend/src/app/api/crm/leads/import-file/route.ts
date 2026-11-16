import { ApiError } from "@/lib/api";
import { getAdminToken, requireAdmin } from "@/lib/auth";

const API_URL = (process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "");

export async function POST(req: Request) {
  await requireAdmin();
  const token = await getAdminToken();
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const qs = url.searchParams.toString();
  const body = await req.arrayBuffer();
  try {
    const res = await fetch(`${API_URL}/api/crm/leads/import-file${qs ? `?${qs}` : ""}`, {
      method: "POST",
      headers: {
        "content-type": "application/octet-stream",
        authorization: `Bearer ${token}`,
      },
      body,
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    return Response.json(data, { status: res.status });
  } catch (e) {
    if (e instanceof ApiError) return Response.json({ error: e.message }, { status: e.status });
    return Response.json({ error: "Import failed" }, { status: 500 });
  }
}
