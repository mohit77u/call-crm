"use server";

import { redirect } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { clearAdminSession, setAdminSession } from "@/lib/auth";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function login(form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  let token: string;
  try {
    const res = await apiFetch<{ token: string }>("/api/auth/admin/login", { body: { email, password } });
    token = res.token;
  } catch (e) {
    fail("/company/login", e instanceof ApiError ? e.message : "Login failed");
  }
  await setAdminSession(token!);
  redirect("/dashboard");
}

export async function logout() {
  await clearAdminSession();
  redirect("/company/login");
}

export async function requestPasswordReset(form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!email) fail("/company/forgot-password", "Enter your email");
  try {
    await apiFetch("/api/auth/forgot-password", { body: { email } });
  } catch (e) {
    fail("/company/forgot-password", e instanceof ApiError ? e.message : "Could not send reset email");
  }
  redirect("/company/forgot-password?sent=1");
}

export async function resetPassword(form: FormData) {
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  if (!token) fail("/company/reset-password", "This reset link is invalid");
  try {
    const { role } = await apiFetch<{ role: string }>("/api/auth/reset-password", { body: { token, password } });
    redirect(role === "superadmin" ? "/admin/login?reset=1" : "/login?reset=1");
  } catch (e) {
    fail(`/company/reset-password?token=${encodeURIComponent(token)}`, e instanceof ApiError ? e.message : "Reset failed");
  }
}
