import { queryOne } from "@/lib/db";
import { getAppSession } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getAppSession(request);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const me = await queryOne(
    `SELECT a.name AS "agentName", c.name AS "companyName" FROM agents a JOIN companies c ON c.id = a.company_id WHERE a.id = $1`,
    [session.agentId],
  );
  return Response.json(me);
}
