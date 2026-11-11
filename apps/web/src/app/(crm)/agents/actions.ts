"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { hashPassword } from "@/lib/password";

function back(message: string, isError = true): never {
  redirect(`/agents?${isError ? "error" : "notice"}=${encodeURIComponent(message)}`);
}

export async function createAgent(form: FormData) {
  const admin = await requireAdmin();
  const name = String(form.get("name") ?? "").trim();
  const username = String(form.get("username") ?? "").trim().toLowerCase();
  const phone = String(form.get("phone") ?? "").trim() || null;
  const password = String(form.get("password") ?? "");
  if (!name || !/^[a-z0-9._-]{3,30}$/.test(username)) back("Name is required; username must be 3-30 letters, digits, . _ or -");
  if (password.length < 6) back("Password must be at least 6 characters");
  const exists = await queryOne("SELECT 1 FROM agents WHERE company_id = $1 AND username = $2", [admin.companyId, username]);
  if (exists) back("This username is already used");
  await query("INSERT INTO agents (company_id, name, username, phone, password_hash) VALUES ($1, $2, $3, $4, $5)", [
    admin.companyId, name, username, phone, await hashPassword(password),
  ]);
  back(`Agent ${name} created`, false);
}

export async function setAgentActive(form: FormData) {
  const admin = await requireAdmin();
  await query("UPDATE agents SET active = $3 WHERE id = $1 AND company_id = $2", [
    Number(form.get("id")), admin.companyId, form.get("active") === "true",
  ]);
  back("Agent updated", false);
}

export async function resetAgentPassword(form: FormData) {
  const admin = await requireAdmin();
  const password = String(form.get("password") ?? "");
  if (password.length < 6) back("Password must be at least 6 characters");
  await query("UPDATE agents SET password_hash = $3 WHERE id = $1 AND company_id = $2", [
    Number(form.get("id")), admin.companyId, await hashPassword(password),
  ]);
  back("Password changed", false);
}

export async function revokeDevice(form: FormData) {
  const admin = await requireAdmin();
  await query("UPDATE devices SET revoked = true WHERE id = $1 AND company_id = $2", [Number(form.get("id")), admin.companyId]);
  back("Device disconnected. The app on that phone is logged out.", false);
}
