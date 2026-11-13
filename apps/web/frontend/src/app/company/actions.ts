"use server";

import { redirect } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { clearAdminSession, setAdminSession } from "@/lib/auth";
import type { AuthFormState } from "@/lib/auth-actions";

export async function login(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  let token: string;
  try {
    const res = await apiFetch<{ token: string }>("/api/auth/admin/login", { body: { email, password } });
    token = res.token;
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Login failed" };
  }
  await setAdminSession(token!);
  redirect("/dashboard");
}

export async function logout() {
  await clearAdminSession();
  redirect("/company/login");
}
