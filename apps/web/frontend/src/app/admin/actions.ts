"use server";

import { redirect } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { clearPlatformSession, setPlatformSession } from "@/lib/auth";
import type { AuthFormState } from "@/lib/auth-actions";

export async function platformLogin(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  let token: string;
  try {
    const res = await apiFetch<{ token: string }>("/api/auth/platform/login", { body: { email, password } });
    token = res.token;
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Login failed" };
  }
  await setPlatformSession(token!);
  redirect("/admin/dashboard");
}

export async function platformLogout() {
  await clearPlatformSession();
  redirect("/admin/login");
}
