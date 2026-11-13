"use server";

import { redirect } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { clearAdminSession, getAdminRefreshToken, setAdminSession } from "@/lib/auth";
import type { AuthFormState } from "@/lib/auth-actions";

export async function login(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  let session: { token: string; refreshToken: string };
  try {
    session = await apiFetch<{ token: string; refreshToken: string }>("/api/auth/admin/login", {
      body: { email, password },
    });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Login failed" };
  }
  await setAdminSession(session.token, session.refreshToken);
  redirect("/company/dashboard");
}

export async function logout() {
  const refreshToken = await getAdminRefreshToken();
  if (refreshToken) {
    await apiFetch("/api/auth/logout", { body: { refreshToken } }).catch(() => {});
  }
  await clearAdminSession();
  redirect("/company/login");
}
