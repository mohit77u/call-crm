"use server";

import { redirect } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { clearPlatformSession, getPlatformRefreshToken, setPlatformSession } from "@/lib/auth";
import type { AuthFormState } from "@/lib/auth-actions";

export async function platformLogin(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  let session: { token: string; refreshToken: string };
  try {
    session = await apiFetch<{ token: string; refreshToken: string }>("/api/auth/platform/login", {
      body: { email, password },
    });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Login failed" };
  }
  await setPlatformSession(session.token, session.refreshToken);
  redirect("/admin/dashboard");
}

export async function platformLogout() {
  const refreshToken = await getPlatformRefreshToken();
  if (refreshToken) {
    await apiFetch("/api/auth/logout", { body: { refreshToken } }).catch(() => {});
  }
  await clearPlatformSession();
  redirect("/admin/login");
}
