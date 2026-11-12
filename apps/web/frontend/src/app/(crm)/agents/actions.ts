"use server";

import { redirect } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { getAdminToken, requireAdmin } from "@/lib/auth";

function back(message: string, isError = true): never {
  redirect(`/agents?${isError ? "error" : "notice"}=${encodeURIComponent(message)}`);
}

export async function createAgent(form: FormData) {
  await requireAdmin();
  const name = String(form.get("name") ?? "").trim();
  const username = String(form.get("username") ?? "").trim().toLowerCase();
  const phone = String(form.get("phone") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!name || !phone || !/^[a-z0-9._-]{3,30}$/.test(username)) back("Name, phone and username (3-30 letters, digits, . _ or -) are required");
  if (password.length < 6) back("Password must be at least 6 characters");
  try {
    await apiFetch("/api/crm/agents", { body: { name, username, phone, password }, token: await getAdminToken() });
  } catch (e) {
    back(e instanceof ApiError ? e.message : "Could not create agent");
  }
  back(`Agent ${name} created`, false);
}

export async function setAgentActive(id: number, active: boolean) {
  await requireAdmin();
  try {
    await apiFetch(`/api/crm/agents/${id}/active`, { body: { active }, token: await getAdminToken() });
  } catch (e) {
    back(e instanceof ApiError ? e.message : "Could not update agent");
  }
  back("Agent updated", false);
}

export async function resetAgentPassword(id: number, password: string) {
  await requireAdmin();
  if (password.length < 6) back("Password must be at least 6 characters");
  try {
    await apiFetch(`/api/crm/agents/${id}/password`, { body: { password }, token: await getAdminToken() });
  } catch (e) {
    back(e instanceof ApiError ? e.message : "Could not reset password");
  }
  back("Password changed", false);
}

export async function deleteAgent(id: number) {
  await requireAdmin();
  try {
    await apiFetch(`/api/crm/agents/${id}`, { method: "DELETE", token: await getAdminToken() });
  } catch (e) {
    redirect(`/agents?error=${encodeURIComponent(e instanceof ApiError ? e.message : "Could not delete agent")}`);
  }
  redirect("/agents?notice=Agent deleted");
}

export async function revokeDevice(id: number) {
  await requireAdmin();
  try {
    await apiFetch(`/api/crm/devices/${id}/revoke`, { method: "POST", token: await getAdminToken() });
  } catch (e) {
    back(e instanceof ApiError ? e.message : "Could not disconnect device");
  }
  back("Device disconnected. The app on that phone is logged out.", false);
}

export async function requestDeviceSync(id: number) {
  await requireAdmin();
  try {
    await apiFetch(`/api/crm/devices/${id}/sync-request`, { method: "POST", token: await getAdminToken() });
  } catch (e) {
    back(e instanceof ApiError ? e.message : "Could not request sync");
  }
  back("Sync requested. The app will send calls on its next check-in.", false);
}

export async function requestAllDeviceSync() {
  await requireAdmin();
  try {
    const res = await apiFetch<{ devices: number }>("/api/crm/devices/sync-all", { method: "POST", token: await getAdminToken() });
    back(`Sync requested for ${res.devices} phone(s).`, false);
  } catch (e) {
    back(e instanceof ApiError ? e.message : "Could not request sync");
  }
}
