import { getSuperadmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { buildPlatformCallWhere, parseCallFilters } from "@/lib/callFilters";
import { STATUS_LABELS, TIME_ZONE, type CallStatus } from "@/lib/calls";
import { csvCell, csvResponse } from "@/lib/csv";

type Row = {
  started: string;
  company: string;
  agent: string;
  phone_number: string;
  contact_name: string | null;
  call_type: string;
  status: CallStatus;
  duration_sec: number;
};

export async function GET(request: Request) {
  if (!(await getSuperadmin())) return new Response("Unauthorized", { status: 401 });
  const f = parseCallFilters(Object.fromEntries(new URL(request.url).searchParams));
  const { where, params } = buildPlatformCallWhere(f);
  params.push(TIME_ZONE);
  const rows = await query<Row>(
    `SELECT to_char(cl.started_at AT TIME ZONE $${params.length}, 'YYYY-MM-DD HH24:MI:SS') AS started,
       c.name AS company, a.name AS agent, cl.phone_number, cl.contact_name, cl.call_type, cl.status, cl.duration_sec
     FROM call_logs cl
     JOIN agents a ON a.id = cl.agent_id
     JOIN companies c ON c.id = cl.company_id
     WHERE ${where} ORDER BY cl.started_at DESC`,
    params,
  );
  return csvResponse(
    `calls-${f.from}-to-${f.to}.csv`,
    "Time,Company,Agent,Number,Name,Type,Status,Duration (sec)",
    rows.map((r) =>
      [r.started, r.company, r.agent, r.phone_number, r.contact_name, r.call_type, STATUS_LABELS[r.status], r.duration_sec]
        .map(csvCell)
        .join(","),
    ),
  );
}
