import { queryOne } from "@/lib/db";
import { normalizeClientCode } from "@/lib/clientCode";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const company = await queryOne<{ name: string }>("SELECT name FROM companies WHERE client_code = $1", [
    normalizeClientCode(body.clientCode),
  ]);
  if (!company) return Response.json({ error: "Invalid client code" }, { status: 404 });
  return Response.json({ companyName: company.name });
}
