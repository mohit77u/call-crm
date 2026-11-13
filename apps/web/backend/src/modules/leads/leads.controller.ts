import { Router } from "express";
import { z } from "zod";
import { asyncHandler, badRequest } from "../../shared/errors";
import { requireAdmin, requireAgent, requireFeature } from "../../middleware/auth";
import { isLeadStatus } from "../../shared/leads";
import { csvCell, sendCsv } from "../../shared/csv";
import { TIME_ZONE } from "../../shared/calls";
import * as leadsService from "./leads.service";

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body ?? {});
  if (!result.success) throw badRequest("Invalid request");
  return result.data;
}

const optStr = (max: number) => z.string().trim().max(max).nullish();

const requestSchema = z.object({
  name: z.string().trim().min(1).max(200),
  phone: optStr(50),
  email: optStr(200),
  notes: optStr(2000),
});

const createSchema = z.object({
  name: z.string().trim().min(1).max(200),
  phone: optStr(50),
  email: optStr(200),
  notes: optStr(2000),
  status: z.string().max(30).optional(),
  assignedAgentId: z.number().int().positive().nullish(),
});

const patchSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  phone: optStr(50),
  email: optStr(200),
  notes: optStr(2000),
  status: z.string().max(30).optional(),
  accountCreated: z.boolean().optional(),
  account_created: z.boolean().optional(),
  assignedAgentId: z.number().int().positive().nullish(),
  assigned_agent_id: z.number().int().positive().nullish(),
});

const approveSchema = z.object({ agentId: z.number().int().positive() });
const rejectSchema = z.object({ reason: optStr(500) });
const importSchema = z.object({
  rows: z.array(z.array(z.unknown())).max(5000),
  mapping: z.object({
    name: z.number().int().min(0).optional(),
    phone: z.number().int().min(0).optional(),
    email: z.number().int().min(0).optional(),
    notes: z.number().int().min(0).optional(),
  }),
  assignment: z.object({
    mode: z.enum(["none", "agent", "roundrobin", "random"]),
    agentId: z.number().int().positive().nullish(),
  }),
});

const q = (v: unknown) => String(Array.isArray(v) ? v[0] : (v ?? "")).trim().slice(0, 100);

// ---------- Agent portal ----------

export const agentLeadsRouter = Router();
agentLeadsRouter.use(requireAgent);
agentLeadsRouter.use(requireFeature("leadManagement"));

agentLeadsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json({ leads: await leadsService.agentListLeads(req.agent!) });
  }),
);

agentLeadsRouter.get(
  "/requests",
  asyncHandler(async (req, res) => {
    res.json({ requests: await leadsService.agentMyRequests(req.agent!) });
  }),
);

agentLeadsRouter.post(
  "/requests",
  asyncHandler(async (req, res) => {
    const input = parse(requestSchema, req.body);
    res.status(201).json({ lead: await leadsService.agentCreateRequest(req.agent!, input) });
  }),
);

agentLeadsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const input = parse(patchSchema, req.body);
    res.json({ lead: await leadsService.agentUpdateLead(req.agent!, Number(req.params.id), input as Record<string, unknown>) });
  }),
);

// ---------- Company admin ----------

export const crmLeadsRouter = Router();
crmLeadsRouter.use(requireAdmin);
crmLeadsRouter.use(requireFeature("leadManagement"));

crmLeadsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Math.floor(Number(req.query.page)) || 1);
    const rawLimit = Number(req.query.limit);
    const perPage = Number.isFinite(rawLimit) ? Math.min(100, Math.max(5, Math.floor(rawLimit))) : 20;
    const status = q(req.query.status);
    res.json(
      await leadsService.adminListLeads(
        req.admin!,
        {
          agent: q(req.query.agent),
          status: isLeadStatus(status) ? status : "",
          q: q(req.query.q),
          createdFrom: q(req.query.createdFrom),
          createdTo: q(req.query.createdTo),
        },
        page,
        perPage,
      ),
    );
  }),
);

crmLeadsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = parse(createSchema, req.body);
    res.status(201).json({ lead: await leadsService.adminCreateLead(req.admin!, input) });
  }),
);

crmLeadsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const input = parse(patchSchema, req.body);
    res.json({ lead: await leadsService.adminUpdateLead(req.admin!, Number(req.params.id), input as Record<string, unknown>) });
  }),
);

crmLeadsRouter.get(
  "/export",
  asyncHandler(async (req, res) => {
    const status = q(req.query.status);
    const rows = await leadsService.adminExportLeadsRows(req.admin!, {
      agent: q(req.query.agent),
      status: isLeadStatus(status) ? status : "",
      q: q(req.query.q),
      createdFrom: q(req.query.createdFrom),
      createdTo: q(req.query.createdTo),
    });
    const fmt = (v: unknown) => (v ? new Date(String(v)).toLocaleString("en-IN", { timeZone: TIME_ZONE }) : "");
    sendCsv(
      res,
      `leads-${new Date().toISOString().slice(0, 10)}.csv`,
      "Name,Phone,Email,Agent,Status,Account created,Notes,Created,Updated",
      rows.map((r: Record<string, unknown>) =>
        [r.name, r.phone, r.email, r.agent, r.status, r.accountCreated ? "Yes" : "No", r.notes, fmt(r.createdAt), fmt(r.updatedAt)]
          .map(csvCell)
          .join(","),
      ),
    );
  }),
);

crmLeadsRouter.post(
  "/import",
  asyncHandler(async (req, res) => {
    const input = parse(importSchema, req.body);
    res.json(await leadsService.adminImportLeads(req.admin!, input));
  }),
);

crmLeadsRouter.get(
  "/requests",
  asyncHandler(async (req, res) => {
    res.json({ requests: await leadsService.adminListRequests(req.admin!) });
  }),
);

crmLeadsRouter.post(
  "/requests/:id/approve",
  asyncHandler(async (req, res) => {
    const { agentId } = parse(approveSchema, req.body);
    res.json({ lead: await leadsService.adminApproveRequest(req.admin!, Number(req.params.id), agentId) });
  }),
);

crmLeadsRouter.post(
  "/requests/:id/reject",
  asyncHandler(async (req, res) => {
    const { reason } = parse(rejectSchema, req.body ?? {});
    res.json({ lead: await leadsService.adminRejectRequest(req.admin!, Number(req.params.id), reason ?? null) });
  }),
);
