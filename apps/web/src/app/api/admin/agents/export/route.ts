import { getSuperadmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { csvCell, csvResponse } from "@/lib/csv";
import { TIME_ZONE } from "@/lib/calls";

type Row = { company: string; name: string; username: string; phone: string | null; active: boolean; last_sync: string | null };

export async function GET(request: Request) {
  if (!(await getSuperadmin())) return new Response("Unauthorized", { status: 401 });
  const sp = new URL(request.url).searchParams;
  const q = sp.get("q")?.trim().slice(0, 60) ?? "";
  const company = /^\d+$/.test(sp.get("company") ?? "") ? sp.get("company")! : "";
  const params: unknown[] = [TIME_ZONE];
  const where = ["true"];
  if (company) {
    params.push(Number(company));
    where.push(`a.company_id = $${params.length}`);
  }
  if (q) {
    params.push(`%${q}%`);
    where.push(`(a.name ILIKE $${params.length} OR a.username ILIKE $${params.length} OR c.name ILIKE $${params.length})`);
  }
  const rows = await query<Row>(
    `SELECT c.name AS company, a.name, a.username, a.phone, a.active,
       to_char((SELECT max(d.last_sync_at) FROM devices d WHERE d.agent_id = a.id AND NOT d.revoked) AT TIME ZONE $1, 'YYYY-MM-DD HH24:MI:SS') AS last_sync
     FROM agents a JOIN companies c ON c.id = a.company_id
     WHERE ${where.join(" AND ")}
     ORDER BY c.name, a.name`,
    params,
  );
  return csvResponse(
    "agents.csv",
    "Company,Name,Username,Phone,Status,Last sync",
    rows.map((r) => [r.company, r.name, r.username, r.phone, r.active ? "Active" : "Disabled", r.last_sync].map(csvCell).join(",")),
  );
}
