"use server";

import { apiFetch, ApiError } from "@/lib/api";
import { getAgentToken, requireAgent } from "@/lib/auth";

export type TrialActionState = { error?: string; notice?: string };

function fail(e: unknown, fallback: string): TrialActionState {
  return { error: e instanceof ApiError ? e.message : fallback };
}

export async function createTrial(input: { name: string; phone: string; days: number }): Promise<TrialActionState> {
  await requireAgent();
  try {
    await apiFetch("/api/agent/trials", { body: input, token: await getAgentToken() });
    return { notice: "Free trial added" };
  } catch (e) {
    return fail(e, "Could not add free trial");
  }
}

export async function updateTrial(id: number, patch: { name?: string; phone?: string; days?: number }): Promise<TrialActionState> {
  await requireAgent();
  try {
    await apiFetch(`/api/agent/trials/${id}`, { method: "PATCH", body: patch, token: await getAgentToken() });
    return { notice: "Free trial updated" };
  } catch (e) {
    return fail(e, "Could not update free trial");
  }
}

export async function deleteTrial(id: number): Promise<TrialActionState> {
  await requireAgent();
  try {
    await apiFetch(`/api/agent/trials/${id}`, { method: "DELETE", token: await getAgentToken() });
    return { notice: "Free trial deleted" };
  } catch (e) {
    return fail(e, "Could not delete free trial");
  }
}
