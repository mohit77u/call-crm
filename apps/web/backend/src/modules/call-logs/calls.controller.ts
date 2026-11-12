import { Router } from "express";
import { asyncHandler } from "../../shared/errors";
import { requireAdmin, requireFeature } from "../../middleware/auth";
import { csvCell, sendCsv } from "../../shared/csv";
import { STATUS_LABELS } from "../../shared/calls";
import { parseCallFilters } from "./call-filters";
import * as callsService from "./calls.service";

export const callsRouter = Router();
callsRouter.use(requireAdmin);

callsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const f = parseCallFilters(req.query as Record<string, unknown>);
    const page = callsService.parsePage(req.query as Record<string, unknown>);
    const rawLimit = Number((req.query as Record<string, unknown>).limit);
    const perPage = Number.isFinite(rawLimit) ? Math.min(100, Math.max(5, Math.floor(rawLimit))) : 20;
    res.json(await callsService.listCalls(req.admin!.companyId, f, page, perPage));
  }),
);

callsRouter.get(
  "/export",
  requireFeature("exports"),
  asyncHandler(async (req, res) => {
    const f = parseCallFilters(req.query as Record<string, unknown>);
    const rows = await callsService.exportCallsRows(req.admin!.companyId, f);
    sendCsv(
      res,
      `calls-${f.from}-to-${f.to}.csv`,
      "Time,Agent,Number,Name,Type,Status,Duration (sec)",
      rows.map((r: Record<string, unknown>) =>
        [r.started, r.agent, r.phone_number, r.contact_name, r.call_type, STATUS_LABELS[r.status as keyof typeof STATUS_LABELS], r.duration_sec]
          .map(csvCell)
          .join(","),
      ),
    );
  }),
);

export const dashboardRouter = Router();
dashboardRouter.use(requireAdmin);

dashboardRouter.get(
  "/",
  requireFeature("reports"),
  asyncHandler(async (req, res) => {
    const f = parseCallFilters(req.query as Record<string, unknown>);
    res.json(await callsService.dashboard(req.admin!.companyId, f));
  }),
);

