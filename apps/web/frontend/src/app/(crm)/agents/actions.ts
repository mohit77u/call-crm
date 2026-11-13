"use server";

import { apiFetch, ApiError } from "@/lib/api";
import { getAdminToken, requireAdmin } from "@/lib/auth";

export type AgentActionState = { error?: string; notice?: string };

function fail(e: unknown, fallback: string): AgentActionState {
  return { error: e instanceof ApiError ? e.message : fallback };
}

function ok(notice: string): AgentActionState {
  return { notice };
}

export async function createAgent(form: FormData): Promise<AgentActionState> {
  await requireAdmin();
  const name = String(form.get("name") ?? "").trim();
  const username = String(form.get("username") ?? "").trim().toLowerCase();
  const phone = String(form.get("phone") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!name || !phone || !/^[a-z0-9._-]{3,30}$/.test(username)) {
    return { error: "Name, phone and username (3-30 letters, digits, . _ or -) are required" };
  }
  if (password.length < 6) return { error: "Password must be at least 6 characters" };
  try {
    await apiFetch("/api/crm/agents", { body: { name, username, phone, password }, token: await getAdminToken() });
    return ok(`Agent ${name} created`);
  } catch (e) {
    return fail(e, "Could not create agent");
  }
}

export async function setAgentActive(id: number, active: boolean): Promise<AgentActionState> {
  await requireAdmin();
  try {
    await apiFetch(`/api/crm/agents/${id}/active`, { body: { active }, token: await getAdminToken() });
    return ok(active ? "Agent enabled" : "Agent disabled");
  } catch (e) {
    return fail(e, "Could not update agent");
  }
}

export async function resetAgentPassword(id: number, password: string): Promise<AgentActionState> {
  await requireAdmin();
  if (password.length < 6) return { error: "Password must be at least 6 characters" };
  try {
    await apiFetch(`/api/crm/agents/${id}/password`, { body: { password }, token: await getAdminToken() });
    return ok("Password changed");
  } catch (e) {
    return fail(e, "Could not reset password");
  }
}

export async function deleteAgent(id: number): Promise<AgentActionState> {
  await requireAdmin();
  try {
    await apiFetch(`/api/crm/agents/${id}`, { method: "DELETE", token: await getAdminToken() });
    return ok("Agent deleted");
  } catch (e) {
    return fail(e, "Could not delete agent");
  }
}

export async function revokeDevice(id: number): Promise<AgentActionState> {
  await requireAdmin();
  try {
    await apiFetch(`/api/crm/devices/${id}/revoke`, { method: "POST", token: await getAdminToken() });
    return ok("Device disconnected. The app on that phone is logged out.");
  } catch (e) {
    return fail(e, "Could not disconnect device");
  }
}

export async function requestDeviceSync(id: number): Promise<AgentActionState> {
  await requireAdmin();
  try {
    await apiFetch(`/api/crm/devices/${id}/sync-request`, { method: "POST", token: await getAdminToken() });
    return ok("Sync requested. The app will send calls on its next check-in.");
  } catch (e) {
    return fail(e, "Could not request sync");
  }
}

export async function requestAllDeviceSync(): Promise<AgentActionState> {
  await requireAdmin();
  try {
    const res = await apiFetch<{ devices: number }>("/api/crm/devices/sync-all", { method: "POST", token: await getAdminToken() });
    return ok(`Sync requested for ${res.devices} phone(s).`);
  } catch (e) {
    return fail(e, "Could not request sync");
  }
}
