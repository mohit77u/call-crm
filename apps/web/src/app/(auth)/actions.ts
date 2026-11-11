"use server";

import { redirect } from "next/navigation";
import { queryOne } from "@/lib/db";
import { hashPassword, checkPassword } from "@/lib/password";
import { endAdminSession, startAdminSession } from "@/lib/auth";
import { generateUniqueClientCode } from "@/lib/clientCode";

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
