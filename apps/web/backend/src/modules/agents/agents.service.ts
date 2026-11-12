import { AppDataSource, returnedRows } from "../../database";
import { hashPassword } from "../../shared/password";
import { badRequest, forbidden, notFound } from "../../shared/errors";
import { agentLimit, getOr404 } from "../companies/companies.service";
import type { AdminContext } from "../../middleware/auth";

export async function listAgentsWithDevices(companyId: number) {
  const agents = await AppDataSource.query(
    "SELECT id, name, username, phone, active FROM agents WHERE company_id = $1 ORDER BY name",
    [companyId],
  );
  const devices = await AppDataSource.query(
    "SELECT * FROM devices WHERE company_id = $1 AND NOT revoked ORDER BY created_at DESC",
    [companyId],
  );
  return { agents, devices };
}

export async function createAgent(admin: AdminContext, input: { name: string; username: string; phone: string | null; password: string }) {
  const company = await getOr404(admin.companyId);
  const limit = agentLimit(company);
  if (limit !== null) {
    const rows = await AppDataSource.query("SELECT count(*)::int AS n FROM agents WHERE company_id = $1", [admin.companyId]);
    if (rows[0].n >= limit) throw forbidden("Agent limit reached for your plan. Contact support to upgrade.");
  }
  const exists = await AppDataSource.query("SELECT 1 FROM agents WHERE company_id = $1 AND username = $2", [
    admin.companyId,
    input.username,
  ]);
  if (exists.length > 0) throw badRequest("This username is already used");
  await AppDataSource.query(
    "INSERT INTO agents (company_id, name, username, phone, password_hash) VALUES ($1, $2, $3, $4, $5)",
    [admin.companyId, input.name, input.username, input.phone, await hashPassword(input.password)],
  );
  return { ok: true };
}

export async function setAgentActive(companyId: number, agentId: number, active: boolean) {
  const rows = returnedRows(
    await AppDataSource.query("UPDATE agents SET active = $3 WHERE id = $1 AND company_id = $2 RETURNING id", [
      agentId,
      companyId,
      active,
    ]),
  );
  if (rows.length === 0) throw notFound("Agent not found");
  return { ok: true };
}

export async function resetAgentPassword(companyId: number, agentId: number, password: string) {
  const rows = returnedRows(
    await AppDataSource.query("UPDATE agents SET password_hash = $3 WHERE id = $1 AND company_id = $2 RETURNING id", [
      agentId,
      companyId,
      await hashPassword(password),
    ]),
  );
  if (rows.length === 0) throw notFound("Agent not found");
  return { ok: true };
}

export async function deleteAgent(companyId: number, agentId: number) {
  // devices and call_logs cascade via FK ON DELETE CASCADE
  const rows = returnedRows(
    await AppDataSource.query("DELETE FROM agents WHERE id = $1 AND company_id = $2 RETURNING id", [
      agentId,
      companyId,
    ]),
  );
  if (rows.length === 0) throw notFound("Agent not found");
  return { ok: true };
}

export async function requestAllDeviceSync(companyId: number) {
  const rows = await AppDataSource.query(
    "UPDATE devices SET sync_requested_at = now() WHERE company_id = $1 AND NOT revoked RETURNING id",
    [companyId],
  );
  return { ok: true, devices: rows.length };
}

export async function requestDeviceSync(companyId: number, deviceId: number) {
  const rows = returnedRows(
    await AppDataSource.query(
      "UPDATE devices SET sync_requested_at = now() WHERE id = $1 AND company_id = $2 AND NOT revoked RETURNING id",
      [deviceId, companyId],
    ),
  );
  if (rows.length === 0) throw notFound("Device not found");
  return { ok: true };
}

export async function revokeDevice(companyId: number, deviceId: number) {
  const rows = returnedRows(
    await AppDataSource.query("UPDATE devices SET revoked = true WHERE id = $1 AND company_id = $2 RETURNING id", [
      deviceId,
      companyId,
    ]),
  );
  if (rows.length === 0) throw notFound("Device not found");
  return { ok: true };
}
