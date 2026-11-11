"use server";

import { redirect } from "next/navigation";
import { queryOne } from "@/lib/db";
import { checkPassword } from "@/lib/password";
import { endPlatformSession, startPlatformSession } from "@/lib/auth";

function fail(message: string): never {
  redirect(`/admin/login?error=${encodeURIComponent(message)}`);
}

export async function platformLogin(form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const row = await queryOne<{ id: number; password_hash: string }>(
    "SELECT id, password_hash FROM superadmins WHERE email = $1",
    [email],
  );
  if (!row || !(await checkPassword(password, row.password_hash))) fail("Wrong email or password");
  await startPlatformSession(row.id);
  redirect("/admin");
}

export async function platformLogout() {
  await endPlatformSession();
  redirect("/admin/login");
}
