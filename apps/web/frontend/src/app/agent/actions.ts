"use server";

import { redirect } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { clearAgentSession, getAgentRefreshToken, setAgentSession } from "@/lib/auth";
import type { AuthFormState } from "@/lib/auth-actions";

export async function login(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const clientCode = String(form.get("clientCode") ?? "").trim();
  const username = String(form.get("username") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  let session: { token: string; refreshToken: string };
  try {
    session = await apiFetch<{ token: string; refreshToken: string }>("/api/auth/agent/login", {
      body: { clientCode, username, password },
    });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Login failed" };
  }
  await setAgentSession(session.token, session.refreshToken);
  redirect("/agent/leads");
}

export async function logout() {
  const refreshToken = await getAgentRefreshToken();
  if (refreshToken) {
    await apiFetch("/api/auth/logout", { body: { refreshToken } }).catch(() => {});
  }
  await clearAgentSession();
  redirect("/agent/login");
}
