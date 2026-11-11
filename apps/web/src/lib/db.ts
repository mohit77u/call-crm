import { Pool, type QueryResultRow } from "pg";
import { hashPassword } from "./password";

const globalForDb = globalThis as unknown as { pool?: Pool; migrated?: Promise<void> };

const pool =
  globalForDb.pool ??
  new Pool({ connectionString: process.env.DATABASE_URL ?? "postgres://callcrm:callcrm@localhost:5432/call_crm" });
globalForDb.pool = pool;

const schema = `
CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  client_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS agents (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  username TEXT NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, username)
);
CREATE TABLE IF NOT EXISTS devices (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  agent_id INT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  model TEXT,
  os_version TEXT,
  app_version TEXT,
  permissions_ok BOOLEAN,
  revoked BOOLEAN NOT NULL DEFAULT false,
  last_seen_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  last_lat DOUBLE PRECISION,
  last_lng DOUBLE PRECISION,
  location_at TIMESTAMPTZ,
  location_accuracy DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS last_lat DOUBLE PRECISION;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS last_lng DOUBLE PRECISION;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS location_at TIMESTAMPTZ;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS location_accuracy DOUBLE PRECISION;
CREATE TABLE IF NOT EXISTS call_logs (
  id BIGSERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  agent_id INT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  device_id INT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  local_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  contact_name TEXT,
  call_type TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  duration_sec INT NOT NULL DEFAULT 0,
  sim TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (device_id, local_id)
);
CREATE INDEX IF NOT EXISTS call_logs_company_started ON call_logs (company_id, started_at DESC);
CREATE INDEX IF NOT EXISTS call_logs_agent_started ON call_logs (agent_id, started_at DESC);
CREATE TABLE IF NOT EXISTS superadmins (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS password_resets (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS password_resets_email ON password_resets (email);
`;

async function seedSuperadmin() {
  const email = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPERADMIN_PASSWORD ?? "";
  if (!email || password.length < 8) return;
  const existing = await pool.query("SELECT 1 FROM superadmins WHERE email = $1", [email]);
  if (existing.rows[0]) return;
  await pool.query("INSERT INTO superadmins (name, email, password_hash) VALUES ($1, $2, $3)", [
    "Admin",
    email,
    await hashPassword(password),
  ]);
}

function migrate() {
  globalForDb.migrated ??= pool.query(schema).then(() => seedSuperadmin());
  return globalForDb.migrated;
}

export async function query<T extends QueryResultRow>(text: string, params: unknown[] = []) {
  await migrate();
  const res = await pool.query<T>(text, params);
  return res.rows;
}

export async function queryOne<T extends QueryResultRow>(text: string, params: unknown[] = []) {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
