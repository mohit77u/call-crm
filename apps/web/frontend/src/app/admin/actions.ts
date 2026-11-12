"use server";

import { redirect } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { clearPlatformSession, setPlatformSession } from "@/lib/auth";

function fail(message: string): never {
  redirect(`/admin/login?error=${encodeURIComponent(message)}`);
}

export async function platformLogin(form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  let token: string;
  try {
    const res = await apiFetch<{ token: string }>("/api/auth/platform/login", { body: { email, password } });
    token = res.token;
  } catch (e) {
    fail(e instanceof ApiError ? e.message : "Login failed");
  }
  await setPlatformSession(token!);
  redirect("/admin");
}

export async function platformLogout() {
  await clearPlatformSession();
  redirect("/admin/login");
}
