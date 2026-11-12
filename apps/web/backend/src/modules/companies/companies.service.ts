import { AppDataSource } from "../../database";
import { generateUniqueClientCode, normalizeClientCode } from "../../shared/clientCode";
import { defaultFeatures, mergeFeatures, normalizeFeatures, type CompanyFeatures, type FeatureKey, type LimitKey } from "../../shared/features";
import { isPlanSlug, planFeatures, type PlanSlug } from "../../shared/plans";
import { badRequest, notFound } from "../../shared/errors";
import { hashPassword } from "../../shared/password";

export type CompanyRow = {
  id: number;
  name: string;
  clientCode: string;
  features: Record<string, unknown>;
  plan: string | null;
  createdAt: Date;
};

const COMPANY_COLS = `id, name, client_code AS "clientCode", features, plan, created_at AS "createdAt"`;

export async function findByClientCode(code: unknown): Promise<CompanyRow | null> {
  const rows = await AppDataSource.query(`SELECT ${COMPANY_COLS} FROM companies WHERE client_code = $1`, [
    normalizeClientCode(code),
  ]);
  return rows[0] ?? null;
}

export async function findById(id: number): Promise<CompanyRow | null> {
  const rows = await AppDataSource.query(`SELECT ${COMPANY_COLS} FROM companies WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function getOr404(id: number): Promise<CompanyRow> {
  const company = await findById(id);
  if (!company) throw notFound("Company not found");
  return company;
}

export async function createCompanyWithAdmin(opts: {
  name: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  plan?: string | null;
  features?: CompanyFeatures;
}) {
  if (opts.plan != null && opts.plan !== "" && !isPlanSlug(opts.plan)) throw badRequest("Invalid plan");
  const plan = isPlanSlug(opts.plan) ? opts.plan : null;
  const clientCode = await generateUniqueClientCode();
  const base = plan ? planFeatures(plan) : defaultFeatures();
  const features = mergeFeatures(base, opts.features);
  const qr = AppDataSource.createQueryRunner();
  await qr.connect();
  await qr.startTransaction();
  try {
    const companyRows = await qr.query(
      `INSERT INTO companies (name, client_code, features, plan) VALUES ($1, $2, $3::jsonb, $4) RETURNING ${COMPANY_COLS}`,
      [opts.name, clientCode, JSON.stringify(features), plan],
    );
    const company = companyRows[0] as CompanyRow;
    await qr.query("INSERT INTO admins (company_id, name, email, password_hash) VALUES ($1, $2, $3, $4)", [
      company.id,
      opts.adminName,
      opts.adminEmail,
      await hashPassword(opts.adminPassword),
    ]);
    await qr.commitTransaction();
    return { company, clientCode };
  } catch (err) {
    await qr.rollbackTransaction();
    throw err;
  } finally {
    await qr.release();
  }
}

export async function updateCompany(id: number, patch: { name?: string; plan?: string | null; features?: unknown }) {
  const company = await getOr404(id);
  const name = patch.name?.trim() || company.name;
  let plan = company.plan;
  let features = company.features;

  if (patch.plan !== undefined) {
    const p = patch.plan;
    const valid = p === null || p === "" || p === "custom" || isPlanSlug(p);
    if (!valid) throw badRequest("Invalid plan");
    plan = isPlanSlug(p) ? p : p === "custom" ? "custom" : null;
    if (isPlanSlug(p)) {
      features = mergeFeatures(planFeatures(p), patch.features ?? {});
    } else if (patch.features !== undefined) {
      features = mergeFeatures(company.features, patch.features);
    }
  } else if (patch.features !== undefined) {
    features = mergeFeatures(company.features, patch.features);
    plan = "custom";
  }

  await AppDataSource.query("UPDATE companies SET name = $2, features = $3::jsonb, plan = $4 WHERE id = $1", [
    id,
    name,
    JSON.stringify(features),
    plan,
  ]);
  return getOr404(id);
}

export async function regenerateClientCode(id: number) {
  await getOr404(id);
  const clientCode = await generateUniqueClientCode();
  await AppDataSource.query("UPDATE companies SET client_code = $2 WHERE id = $1", [id, clientCode]);
  return clientCode;
}

export function isFeatureOn(company: { features?: unknown } | null | undefined, key: FeatureKey) {
  return normalizeFeatures(company?.features)[key] === true;
}

export function agentLimit(company: { features?: unknown } | null | undefined): number | null {
  const v = normalizeFeatures(company?.features).maxAgents as number | null | undefined;
  return typeof v === "number" ? v : null;
}

export type { FeatureKey, LimitKey };
