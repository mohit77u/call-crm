"use server";

import { apiFetch, ApiError } from "@/lib/api";
import { getAdminToken, requireAdmin } from "@/lib/auth";
import type { LeadRow } from "@/lib/leads";

export type LeadActionState = { error?: string; notice?: string };

function fail(e: unknown, fallback: string): LeadActionState {
  return { error: e instanceof ApiError ? e.message : fallback };
}

export async function createLead(input: {
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  status?: string;
  assignedAgentId?: number | null;
}): Promise<LeadActionState> {
  await requireAdmin();
  if (!input.name.trim()) return { error: "Name is required" };
  try {
    await apiFetch("/api/crm/leads", {
      body: {
        name: input.name.trim(),
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        notes: input.notes?.trim() || null,
        status: input.status || undefined,
        assignedAgentId: input.assignedAgentId ?? null,
      },
      token: await getAdminToken(),
    });
    return { notice: "Lead created" };
  } catch (e) {
    return fail(e, "Could not create lead");
  }
}

export async function updateLead(
  id: number,
  patch: Partial<Pick<LeadRow, "name" | "phone" | "email" | "notes" | "status" | "accountCreated">> & { assignedAgentId?: number | null },
): Promise<LeadActionState> {
  await requireAdmin();
  try {
    await apiFetch(`/api/crm/leads/${id}`, { method: "PATCH", body: patch, token: await getAdminToken() });
    return { notice: "Lead updated" };
  } catch (e) {
    return fail(e, "Could not update lead");
  }
}

export async function deleteLead(id: number): Promise<LeadActionState> {
  await requireAdmin();
  try {
    await apiFetch(`/api/crm/leads/${id}`, { method: "DELETE", token: await getAdminToken() });
    return { notice: "Lead deleted" };
  } catch (e) {
    return fail(e, "Could not delete lead");
  }
}

export async function deleteLeadsBulk(input: { ids?: number[]; all?: boolean }): Promise<LeadActionState & { deleted?: number; requested?: number }> {
  await requireAdmin();
  try {
    const res = await apiFetch<{ deleted: number; requested: number }>("/api/crm/leads/bulk-delete", { body: input, token: await getAdminToken() });
    const skipped = res.requested > 0 ? res.requested - res.deleted : 0;
    const notice =
      res.deleted === 0
        ? "No leads deleted (already removed)"
        : skipped > 0
          ? `${res.deleted} lead${res.deleted === 1 ? "" : "s"} deleted (${skipped} already removed)`
          : `${res.deleted} lead${res.deleted === 1 ? "" : "s"} deleted`;
    return { notice, deleted: res.deleted, requested: res.requested };
  } catch (e) {
    return fail(e, "Could not delete leads");
  }
}

export async function assignLeadsToAgent(input: { count: number; agentId: number; leadIds?: number[] }): Promise<LeadActionState & { assigned?: number; requested?: number }> {
  await requireAdmin();
  try {
    const res = await apiFetch<{ assigned: number; requested: number }>("/api/crm/leads/assign", {
      body: input,
      token: await getAdminToken(),
    });
    return { assigned: res.assigned, requested: res.requested };
  } catch (e) {
    return fail(e, "Could not assign leads");
  }
}

export async function approveLeadRequest(id: number, agentId: number): Promise<LeadActionState> {
  await requireAdmin();
  try {
    await apiFetch(`/api/crm/leads/requests/${id}/approve`, { body: { agentId }, token: await getAdminToken() });
    return { notice: "Request approved and lead assigned" };
  } catch (e) {
    return fail(e, "Could not approve request");
  }
}

export async function importLeads(input: {
  rows: unknown[][];
  mapping: { name?: number; phone?: number; email?: number; notes?: number };
  assignment: { mode: "none" | "agent" | "roundrobin" | "random"; agentId?: number | null };
}): Promise<LeadActionState & { imported?: number; skipped?: number; total?: number }> {
  await requireAdmin();
  try {
    const res = await apiFetch<{ imported: number; skipped: number; total: number }>("/api/crm/leads/import", {
      body: input,
      token: await getAdminToken(),
    });
    return { notice: `Imported ${res.imported} lead${res.imported === 1 ? "" : "s"} (${res.skipped} skipped)`, imported: res.imported, skipped: res.skipped, total: res.total };
  } catch (e) {
    return fail(e, "Import failed");
  }
}

export async function rejectLeadRequest(id: number, reason?: string): Promise<LeadActionState> {
  await requireAdmin();
  try {
    await apiFetch(`/api/crm/leads/requests/${id}/reject`, { body: { reason: reason?.trim() || null }, token: await getAdminToken() });
    return { notice: "Request rejected" };
  } catch (e) {
    return fail(e, "Could not reject request");
  }
}
