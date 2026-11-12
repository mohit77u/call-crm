import { Router } from "express";
import { z } from "zod";
import { asyncHandler, badRequest } from "../../shared/errors";
import { requireSuperadmin } from "../../middleware/auth";
import { csvCell, sendCsv } from "../../shared/csv";
import { STATUS_LABELS } from "../../shared/calls";
import { FEATURE_DEFS, LIMIT_DEFS } from "../../shared/features";
import { parseCallFilters } from "../call-logs/call-filters";
import * as callsService from "../call-logs/calls.service";
import * as superadminService from "./superadmin.service";

export const adminRouter = Router();
adminRouter.use(requireSuperadmin);

const q = (v: unknown) => String(Array.isArray(v) ? v[0] : (v ?? "")).trim().slice(0, 60);
const companyParam = (v: unknown) => (/^\d+$/.test(String(v ?? "")) ? String(v) : "");

const createCompanySchema = z.object({
  name: z.string().trim().min(1).max(200),
  adminName: z.string().trim().min(1).max(200),
  adminEmail: z.string().trim().toLowerCase().email().max(200),
  adminPassword: z.string().min(8).max(200),
  plan: z.string().max(30).optional(),
  features: z.record(z.union([z.boolean(), z.number(), z.null()])).optional(),
});

const updateCompanySchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  plan: z.string().max(30).nullable().optional(),
  features: z.record(z.union([z.boolean(), z.number(), z.null()])).optional(),
});

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body ?? {});
  if (!result.success) throw badRequest("Invalid request");
  return result.data;
}

adminRouter.get(
  "/overview",
  asyncHandler(async (req, res) => {
    res.json(await superadminService.overview(q(req.query.q)));
  }),
);

adminRouter.get(
  "/agents",
  asyncHandler(async (req, res) => {
    res.json(await superadminService.listAgents(companyParam(req.query.company), q(req.query.q)));
  }),
);

adminRouter.get(
  "/calls",
  asyncHandler(async (req, res) => {
    const f = parseCallFilters(req.query as Record<string, unknown>);
    const page = callsService.parsePage(req.query as Record<string, unknown>);
    res.json(await callsService.platformListCalls(f, page));
  }),
);

// ---- Company management ----

adminRouter.get(
  "/companies",
  asyncHandler(async (_req, res) => {
    res.json({ companies: await superadminService.listCompanies() });
  }),
);

adminRouter.post(
  "/companies",
  asyncHandler(async (req, res) => {
    const input = parse(createCompanySchema, req.body);
    res.status(201).json(await superadminService.createCompany(input));
  }),
);

adminRouter.get(
  "/companies/:id",
  asyncHandler(async (req, res) => {
    res.json(await superadminService.companyDetail(Number(req.params.id)));
  }),
);

adminRouter.patch(
  "/companies/:id",
  asyncHandler(async (req, res) => {
    const input = parse(updateCompanySchema, req.body);
    const company = await superadminService.updateCompany(Number(req.params.id), {
      name: input.name,
      plan: input.plan,
      features: input.features,
    });
    res.json({ company });
  }),
);

adminRouter.delete(
  "/companies/:id",
  asyncHandler(async (req, res) => {
    await superadminService.deleteCompany(Number(req.params.id));
    res.json({ ok: true });
  }),
);

adminRouter.post(
  "/companies/:id/client-code",
  asyncHandler(async (req, res) => {
    const clientCode = await superadminService.regenerateClientCode(Number(req.params.id));
    res.json({ ok: true, clientCode });
  }),
);

// ---- CSV exports ----

adminRouter.get(
  "/exports/companies.csv",
  asyncHandler(async (req, res) => {
    const rows = await superadminService.exportCompaniesRows(q(req.query.q));
    sendCsv(
      res,
      "companies.csv",
      "Company,Client code,Plan,Admin email,Agents,Calls,Created",
      rows.map((r: Record<string, unknown>) =>
        [r.name, r.client_code, r.plan, r.admin_email, r.agents, r.calls, r.created].map(csvCell).join(","),
      ),
    );
  }),
);

adminRouter.get(
  "/exports/agents.csv",
  asyncHandler(async (req, res) => {
    const rows = await superadminService.exportAgentsRows(companyParam(req.query.company), q(req.query.q));
    sendCsv(
      res,
      "agents.csv",
      "Company,Name,Username,Phone,Status,Last sync",
      rows.map((r: Record<string, unknown>) =>
        [r.company, r.name, r.username, r.phone, r.active ? "Active" : "Disabled", r.last_sync].map(csvCell).join(","),
      ),
    );
  }),
);

adminRouter.get(
  "/exports/calls.csv",
  asyncHandler(async (req, res) => {
    const f = parseCallFilters(req.query as Record<string, unknown>);
    const rows = await callsService.platformExportCallsRows(f);
    sendCsv(
      res,
      `calls-${f.from}-to-${f.to}.csv`,
      "Time,Company,Agent,Number,Name,Type,Status,Duration (sec)",
      rows.map((r: Record<string, unknown>) =>
        [r.started, r.company, r.agent, r.phone_number, r.contact_name, r.call_type, STATUS_LABELS[r.status as keyof typeof STATUS_LABELS], r.duration_sec]
          .map(csvCell)
          .join(","),
      ),
    );
  }),
);

// Expose the feature/limit registry so the admin UI can render toggles.
adminRouter.get(
  "/features",
  asyncHandler(async (_req, res) => {
    res.json({ features: FEATURE_DEFS, limits: LIMIT_DEFS });
  }),
);
