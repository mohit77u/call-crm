import { query } from "@/lib/db";
import { getAppSession } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getAppSession(request);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  await query(
    `UPDATE devices SET last_seen_at = now(), permissions_ok = $2, app_version = COALESCE($3, app_version) WHERE id = $1`,
    [session.deviceId, typeof body.permissionsOk === "boolean" ? body.permissionsOk : null, body.appVersion ?? null],
  );
  return Response.json({ ok: true });
}
