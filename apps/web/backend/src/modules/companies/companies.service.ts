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

export async function createCompanyWithAdmins(opts: {
  name: string;
  admins: { name: string; email: string; password: string }[];
  plan?: string | null;
  features?: CompanyFeatures;
}) {
  if (opts.plan != null && opts.plan !== "" && !isPlanSlug(opts.plan)) throw badRequest("Invalid plan");
  if (!opts.admins.length) throw badRequest("At least one admin is required");
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
    for (const admin of opts.admins) {
      await qr.query("INSERT INTO admins (company_id, name, email, password_hash) VALUES ($1, $2, $3, $4)", [
        company.id,
        admin.name,
        admin.email,
        await hashPassword(admin.password),
      ]);
    }
    await qr.commitTransaction();
    return { company, clientCode };
  } catch (err) {
    await qr.rollbackTransaction();
    throw err;
  } finally {
    await qr.release();
  }
}

export const MAX_ADMINS_PER_COMPANY = 3;

export async function updateCompanyAdmins(
  companyId: number,
  input: {
    upserts: { id?: number; name: string; email: string; password?: string }[];
    removeIds: number[];
  },
) {
  await getOr404(companyId);
  const existing = (await AppDataSource.query("SELECT id, name, email FROM admins WHERE company_id = $1", [companyId])) as {
    id: number;
    name: string;
    email: string;
  }[];
  const existingById = new Map(existing.map((a) => [a.id, a]));

  const removeSet = new Set(input.removeIds.filter((id) => existingById.has(id)));
  const updating = input.upserts.filter((u) => u.id != null && existingById.has(u.id) && !removeSet.has(u.id));
  const creating = input.upserts.filter((u) => u.id == null);
  const ignored = input.upserts.length - updating.length - creating.length;
  void ignored;

  const total = existing.length - removeSet.size + creating.length;
  if (total < 1) throw badRequest("At least one admin must remain");
  if (total > MAX_ADMINS_PER_COMPANY) throw badRequest(`A company can have at most ${MAX_ADMINS_PER_COMPANY} admins`);

  // Final email set must be unique; an unchanged email on its own row is allowed.
  const finalEmails = [
    ...existing.filter((a) => !removeSet.has(a.id) && !updating.some((u) => u.id === a.id)).map((a) => a.email.toLowerCase()),
    ...updating.map((u) => u.email.trim().toLowerCase()),
    ...creating.map((u) => u.email.trim().toLowerCase()),
  ];
  if (new Set(finalEmails).size !== finalEmails.length) throw badRequest("Admin emails must be unique");
  for (const email of finalEmails) {
    const clash = await AppDataSource.query("SELECT id, company_id FROM admins WHERE email = $1", [email]);
    for (const row of clash as { id: number; company_id: number }[]) {
      const isSelf = updating.some((u) => u.id === row.id && row.company_id === companyId);
      if (!isSelf) throw badRequest("This email is already registered");
    }
  }

  const qr = AppDataSource.createQueryRunner();
  await qr.connect();
  await qr.startTransaction();
  try {
    for (const id of removeSet) {
      await qr.query("DELETE FROM admins WHERE id = $1 AND company_id = $2", [id, companyId]);
    }
    for (const u of updating) {
      const sets = ["name = $3", "email = $4"];
      const params: unknown[] = [u.id, companyId, u.name.trim(), u.email.trim().toLowerCase()];
      if (u.password) {
        params.push(await hashPassword(u.password));
        sets.push(`password_hash = $${params.length}`);
      }
      await qr.query(`UPDATE admins SET ${sets.join(", ")} WHERE id = $1 AND company_id = $2`, params);
    }
    for (const u of creating) {
      if (!u.password) throw badRequest("Password is required for new admins");
      await qr.query("INSERT INTO admins (company_id, name, email, password_hash) VALUES ($1, $2, $3, $4)", [
        companyId,
        u.name.trim(),
        u.email.trim().toLowerCase(),
        await hashPassword(u.password),
      ]);
    }
    await qr.commitTransaction();
  } catch (err) {
    await qr.rollbackTransaction();
    throw err;
  } finally {
    await qr.release();
  }
  return AppDataSource.query("SELECT id, name, email, created_at AS \"createdAt\" FROM admins WHERE company_id = $1 ORDER BY id", [companyId]);
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
