"use server";

import { apiFetch, ApiError } from "@/lib/api";
import { getAgentToken, requireAgent } from "@/lib/auth";
import type { LeadRow } from "@/lib/leads";

export type LeadActionState = { error?: string; notice?: string };

function fail(e: unknown, fallback: string): LeadActionState {
  return { error: e instanceof ApiError ? e.message : fallback };
}

export async function createLeadRequest(input: {
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
}): Promise<LeadActionState> {
  await requireAgent();
  if (!input.name.trim()) return { error: "Name is required" };
  try {
    await apiFetch("/api/agent/leads/requests", {
      body: {
        name: input.name.trim(),
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        notes: input.notes?.trim() || null,
      },
      token: await getAgentToken(),
    });
    return { notice: "Lead request sent to admin" };
  } catch (e) {
    return fail(e, "Could not send request");
  }
}

export async function updateAgentLead(
  id: number,
  patch: Partial<Pick<LeadRow, "name" | "phone" | "email" | "notes" | "status" | "accountCreated">>,
): Promise<LeadActionState> {
  await requireAgent();
  try {
    await apiFetch(`/api/agent/leads/${id}`, { method: "PATCH", body: patch, token: await getAgentToken() });
    return { notice: "Lead updated" };
  } catch (e) {
    return fail(e, "Could not update lead");
  }
}
