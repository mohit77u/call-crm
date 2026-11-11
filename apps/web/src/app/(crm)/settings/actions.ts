"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { generateUniqueClientCode } from "@/lib/clientCode";

export async function updateCompanyName(form: FormData) {
  const admin = await requireAdmin();
  const name = String(form.get("name") ?? "").trim();
  if (name) await query("UPDATE companies SET name = $2 WHERE id = $1", [admin.companyId, name]);
  redirect("/settings?notice=Saved");
}

export async function regenerateClientCode() {
  const admin = await requireAdmin();
  await query("UPDATE companies SET client_code = $2 WHERE id = $1", [admin.companyId, await generateUniqueClientCode()]);
  redirect("/settings?notice=New client code generated");
}
