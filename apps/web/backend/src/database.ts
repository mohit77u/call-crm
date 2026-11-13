import "reflect-metadata";
import { DataSource } from "typeorm";
import { config } from "./config";
import { hashPassword } from "./shared/password";
import { Company } from "./modules/companies/company.entity";
import { Admin } from "./modules/admins/admin.entity";
import { Agent } from "./modules/agents/agent.entity";
import { Device } from "./modules/devices/device.entity";
import { CallLog } from "./modules/call-logs/call-log.entity";
import { Superadmin } from "./modules/superadmin/superadmin.entity";
import { PasswordReset } from "./modules/password-resets/password-reset.entity";
import { ContactEnquiry } from "./modules/contact/contact-enquiry.entity";
import { Lead } from "./modules/leads/lead.entity";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: config.databaseUrl,
  entities: [Company, Admin, Agent, Device, CallLog, Superadmin, PasswordReset, ContactEnquiry, Lead],
  synchronize: false,
  // TypeORM/pg pool tuning — keep connections bounded for low-traffic deploys.
  extra: {
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  },
  logging: false,
});

const DEFAULT_FEATURES = `{"callSync":true,"locations":true,"exports":true,"reports":true,"leadManagement":true,"maxAgents":null}`;

const schema = `
CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  client_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS features JSONB;
UPDATE companies SET features = '${DEFAULT_FEATURES}'::jsonb WHERE features IS NULL;
ALTER TABLE companies ALTER COLUMN features SET DEFAULT '${DEFAULT_FEATURES}'::jsonb;
ALTER TABLE companies ALTER COLUMN features SET NOT NULL;
UPDATE companies SET features = features || '{"leadManagement":true}'::jsonb WHERE NOT (features ? 'leadManagement');
ALTER TABLE companies ADD COLUMN IF NOT EXISTS plan TEXT;
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
ALTER TABLE devices ADD COLUMN IF NOT EXISTS sync_requested_at TIMESTAMPTZ;
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
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS sim_details JSONB;
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
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id SERIAL PRIMARY KEY,
  role TEXT NOT NULL,
  user_id INT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS refresh_tokens_user ON refresh_tokens (role, user_id);
CREATE TABLE IF NOT EXISTS contact_enquiries (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  plan TEXT,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  assigned_agent_id INT REFERENCES agents(id) ON DELETE SET NULL,
  requested_by_agent_id INT REFERENCES agents(id) ON DELETE SET NULL,
  created_by_type TEXT NOT NULL,
  created_by_id INT NOT NULL,
  source TEXT NOT NULL DEFAULT 'request',
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  account_created BOOLEAN NOT NULL DEFAULT false,
  request_status TEXT,
  assigned_at TIMESTAMPTZ,
  last_contacted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS leads_company ON leads (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS leads_agent ON leads (assigned_agent_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS leads_request ON leads (company_id, request_status) WHERE request_status IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS leads_company_phone ON leads (company_id, phone) WHERE phone IS NOT NULL AND phone <> '';
`;

// TypeORM's query() returns [rows, affectedCount] for UPDATE/DELETE but a plain
// rows array for SELECT/INSERT. Normalize to always get the rows array.
export function returnedRows<T = Record<string, unknown>>(result: unknown): T[] {
  const r = result as unknown[] | undefined;
  if (Array.isArray(r?.[0])) return r[0] as T[];
  return Array.isArray(r) ? (r as T[]) : [];
}

export async function bootstrapSchema() {
  await AppDataSource.query(schema);
}

export async function seedSuperadmin() {
  const password = config.superadminPassword;
  if (config.superadminEmails.length === 0 || password.length < 8) return;
  const hash = await hashPassword(password);
  for (const email of config.superadminEmails) {
    const existing = await AppDataSource.query("SELECT 1 FROM superadmins WHERE email = $1", [email]);
    if (existing.length > 0) continue;
    await AppDataSource.query("INSERT INTO superadmins (name, email, password_hash) VALUES ($1, $2, $3)", [
      email.split("@")[0],
      email,
      hash,
    ]);
    console.log(`Seeded superadmin: ${email}`);
  }
}
