"use server";

import { redirect } from "next/navigation";
import { apiFetch, ApiError } from "./api";

export type AuthFormState = { error?: string; sent?: boolean };

export async function requestPasswordReset(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Enter your email" };
  try {
    await apiFetch("/api/auth/forgot-password", { body: { email } });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Could not send reset email" };
  }
  return { sent: true };
}

export async function resetPassword(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  if (!token) return { error: "This reset link is invalid" };
  try {
    const { role } = await apiFetch<{ role: string }>("/api/auth/reset-password", { body: { token, password } });
    redirect(role === "superadmin" ? "/admin/login" : "/company/login");
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Reset failed" };
  }
}
