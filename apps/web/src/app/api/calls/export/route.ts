import { getAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { buildCallWhere, parseCallFilters } from "@/lib/callFilters";
import { STATUS_LABELS, TIME_ZONE, type CallStatus } from "@/lib/calls";

type Row = { started: string; agent: string; phone_number: string; contact_name: string | null; call_type: string; status: CallStatus; duration_sec: number };

function csv(value: unknown) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request: Request) {
  const admin = await getAdmin();
  if (!admin) return new Response("Unauthorized", { status: 401 });
  const f = parseCallFilters(Object.fromEntries(new URL(request.url).searchParams));
  const { where, params } = buildCallWhere(admin.companyId, f);
  params.push(TIME_ZONE);
  const rows = await query<Row>(
    `SELECT to_char(cl.started_at AT TIME ZONE $${params.length}, 'YYYY-MM-DD HH24:MI:SS') AS started, a.name AS agent,
       cl.phone_number, cl.contact_name, cl.call_type, cl.status, cl.duration_sec
     FROM call_logs cl JOIN agents a ON a.id = cl.agent_id
     WHERE ${where} ORDER BY cl.started_at DESC`,
    params,
  );
  const lines = [
    "Time,Agent,Number,Name,Type,Status,Duration (sec)",
    ...rows.map((r) => [r.started, r.agent, r.phone_number, r.contact_name, r.call_type, STATUS_LABELS[r.status], r.duration_sec].map(csv).join(",")),
  ];
  return new Response(lines.join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="calls-${f.from}-to-${f.to}.csv"`,
    },
  });
}
