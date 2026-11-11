import { getSuperadmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { csvCell, csvResponse } from "@/lib/csv";
import { TIME_ZONE } from "@/lib/calls";

type Row = { name: string; client_code: string; admin_email: string | null; agents: number; calls: number; created: string };

export async function GET(request: Request) {
  if (!(await getSuperadmin())) return new Response("Unauthorized", { status: 401 });
  const q = new URL(request.url).searchParams.get("q")?.trim().slice(0, 60) ?? "";
  const params: unknown[] = [TIME_ZONE];
  let where = "true";
  if (q) {
    params.push(`%${q}%`);
    where = `(c.name ILIKE $2 OR c.client_code ILIKE $2 OR COALESCE(a.email, '') ILIKE $2)`;
  }
  const rows = await query<Row>(
    `SELECT c.name, c.client_code,
       (SELECT a.email FROM admins a WHERE a.company_id = c.id ORDER BY a.id LIMIT 1) AS admin_email,
       (SELECT count(*)::int FROM agents ag WHERE ag.company_id = c.id) AS agents,
       (SELECT count(*)::int FROM call_logs cl WHERE cl.company_id = c.id) AS calls,
       to_char(c.created_at AT TIME ZONE $1, 'YYYY-MM-DD HH24:MI:SS') AS created
     FROM companies c
     LEFT JOIN LATERAL (SELECT email FROM admins WHERE company_id = c.id ORDER BY id LIMIT 1) a ON true
     WHERE ${where}
     ORDER BY c.created_at DESC`,
    params,
  );
  return csvResponse(
    "companies.csv",
    "Company,Client code,Admin email,Agents,Calls,Created",
    rows.map((r) => [r.name, r.client_code, r.admin_email, r.agents, r.calls, r.created].map(csvCell).join(",")),
  );
}
