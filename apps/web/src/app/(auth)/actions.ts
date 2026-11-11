"use server";

import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { hashPassword, checkPassword } from "@/lib/password";
import { endAdminSession, startAdminSession } from "@/lib/auth";
import { generateUniqueClientCode } from "@/lib/clientCode";
import { appUrl, mailConfigured, sendMail } from "@/lib/mail";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function signup(form: FormData) {
  const company = String(form.get("company") ?? "").trim();
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!company || !name || !email) fail("/signup", "All fields are required");
  if (password.length < 8) fail("/signup", "Password must be at least 8 characters");
  if (await queryOne("SELECT 1 FROM admins WHERE email = $1", [email])) fail("/signup", "This email is already registered");

  const code = await generateUniqueClientCode();
  const c = await queryOne<{ id: number }>("INSERT INTO companies (name, client_code) VALUES ($1, $2) RETURNING id", [company, code]);
  const a = await queryOne<{ id: number }>(
    "INSERT INTO admins (company_id, name, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id",
    [c!.id, name, email, await hashPassword(password)],
  );
  await startAdminSession(a!.id, c!.id);
  redirect("/settings?welcome=1");
}

export async function login(form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const admin = await queryOne<{ id: number; company_id: number; password_hash: string }>(
    "SELECT id, company_id, password_hash FROM admins WHERE email = $1",
    [email],
  );
  if (!admin || !(await checkPassword(password, admin.password_hash))) fail("/login", "Wrong email or password");
  await startAdminSession(admin.id, admin.company_id);
  redirect("/dashboard");
}

export async function logout() {
  await endAdminSession();
  redirect("/login");
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function requestPasswordReset(form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!email) fail("/forgot-password", "Enter your email");
  if (!mailConfigured()) fail("/forgot-password", "Email is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS.");

  const companyAdmin = await queryOne("SELECT 1 FROM admins WHERE email = $1", [email]);
  const platform = companyAdmin ? null : await queryOne("SELECT 1 FROM superadmins WHERE email = $1", [email]);
  const role = companyAdmin ? "admin" : platform ? "superadmin" : null;

  if (role) {
    const token = randomBytes(32).toString("hex");
    await query("DELETE FROM password_resets WHERE email = $1 AND role = $2 AND used_at IS NULL", [email, role]);
    await query(
      "INSERT INTO password_resets (email, role, token_hash, expires_at) VALUES ($1, $2, $3, now() + interval '1 hour')",
      [email, role, tokenHash(token)],
    );
    const link = `${appUrl()}/reset-password?token=${token}`;
    await sendMail({
      to: email,
      subject: "Reset your Call CRM password",
      text: `Reset your password using this link (valid for 1 hour):\n\n${link}\n\nIf you did not ask for this, ignore this email.`,
    });
  }
  redirect("/forgot-password?sent=1");
}

export async function resetPassword(form: FormData) {
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  if (!token) fail("/reset-password", "This reset link is invalid");
  if (password.length < 8) fail(`/reset-password?token=${encodeURIComponent(token)}`, "Password must be at least 8 characters");

  const row = await queryOne<{ id: number; email: string; role: string }>(
    "SELECT id, email, role FROM password_resets WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()",
    [tokenHash(token)],
  );
  if (!row) fail("/reset-password", "This reset link is invalid or has expired");

  const hash = await hashPassword(password);
  if (row.role === "superadmin") {
    await query("UPDATE superadmins SET password_hash = $1 WHERE email = $2", [hash, row.email]);
  } else {
    await query("UPDATE admins SET password_hash = $1 WHERE email = $2", [hash, row.email]);
  }
  await query("UPDATE password_resets SET used_at = now() WHERE id = $1", [row.id]);
  redirect(row.role === "superadmin" ? "/admin/login?reset=1" : "/login?reset=1");
}
