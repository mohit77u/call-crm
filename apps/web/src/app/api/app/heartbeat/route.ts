import { query } from "@/lib/db";
import { getAppSession } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getAppSession(request);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));

  const loc = body.location;
  const lat = loc && Number.isFinite(Number(loc.lat)) ? Number(loc.lat) : null;
  const lng = loc && Number.isFinite(Number(loc.lng)) ? Number(loc.lng) : null;
  const validLocation = lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  const accuracy = loc && Number.isFinite(Number(loc.accuracy)) ? Number(loc.accuracy) : null;
  const locTime = loc && Number.isFinite(Number(loc.time)) ? new Date(Number(loc.time)) : null;

  await query(
    `UPDATE devices SET last_seen_at = now(), permissions_ok = $2, app_version = COALESCE($3, app_version),
       last_lat = COALESCE($4, last_lat), last_lng = COALESCE($5, last_lng),
       location_at = COALESCE($6, location_at), location_accuracy = COALESCE($7, location_accuracy)
     WHERE id = $1`,
    [
      session.deviceId,
      typeof body.permissionsOk === "boolean" ? body.permissionsOk : null,
      body.appVersion ?? null,
      validLocation ? lat : null,
      validLocation ? lng : null,
      validLocation ? locTime : null,
      validLocation ? accuracy : null,
    ],
  );
  return Response.json({ ok: true });
}
