"use server";

import { apiFetch, ApiError } from "@/lib/api";
import { getAgentToken, requireAgent } from "@/lib/auth";

export type ClientActionState = { error?: string; notice?: string };

function fail(e: unknown, fallback: string): ClientActionState {
  return { error: e instanceof ApiError ? e.message : fallback };
}

export async function createClient(input: Record<string, unknown>): Promise<ClientActionState> {
  await requireAgent();
  try {
    await apiFetch("/api/agent/clients", { method: "POST", body: input, token: await getAgentToken() });
    return { notice: "Client created" };
  } catch (e) {
    return fail(e, "Could not create client");
  }
}

export async function updateClient(id: number, patch: Record<string, unknown>): Promise<ClientActionState> {
  await requireAgent();
  try {
    await apiFetch(`/api/agent/clients/${id}`, { method: "PATCH", body: patch, token: await getAgentToken() });
    return { notice: "Client updated" };
  } catch (e) {
    return fail(e, "Could not update client");
  }
}

export async function deleteClient(id: number): Promise<ClientActionState> {
  await requireAgent();
  try {
    await apiFetch(`/api/agent/clients/${id}`, { method: "DELETE", token: await getAgentToken() });
    return { notice: "Client deleted" };
  } catch (e) {
    return fail(e, "Could not delete client");
  }
}
