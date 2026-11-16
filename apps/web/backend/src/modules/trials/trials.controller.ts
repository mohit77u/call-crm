import { Router } from "express";
import { z } from "zod";
import { asyncHandler, badRequest } from "../../shared/errors";
import { requireAdmin, requireAgent, requireFeature } from "../../middleware/auth";
import * as trialsService from "./trials.service";

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body ?? {});
  if (!result.success) throw badRequest("Invalid request");
  return result.data;
}

const trialSchema = z.object({
  name: z.string().trim().min(1).max(200),
  phone: z.string().trim().min(1).max(50),
  days: z.number().int().min(1).max(7),
});

const patchSchema = trialSchema.partial();

export const agentTrialsRouter = Router();
agentTrialsRouter.use(requireAgent);
agentTrialsRouter.use(requireFeature("leadManagement"));

agentTrialsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json({ trials: await trialsService.agentListTrials(req.agent!) });
  }),
);

agentTrialsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = parse(trialSchema, req.body);
    res.status(201).json({ trial: await trialsService.agentCreateTrial(req.agent!, input) });
  }),
);

agentTrialsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const input = parse(patchSchema, req.body);
    res.json({ trial: await trialsService.agentUpdateTrial(req.agent!, Number(req.params.id), input as Record<string, unknown>) });
  }),
);

agentTrialsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json(await trialsService.agentDeleteTrial(req.agent!, Number(req.params.id)));
  }),
);

// ---------- Company admin (read-only listing) ----------

export const crmTrialsRouter = Router();
crmTrialsRouter.use(requireAdmin);
crmTrialsRouter.use(requireFeature("leadManagement"));

crmTrialsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = (v: unknown) => String(Array.isArray(v) ? v[0] : (v ?? "")).trim().slice(0, 100);
    res.json({
      trials: await trialsService.adminListTrials(req.admin!, {
        agent: q(req.query.agent),
        status: q(req.query.status),
        q: q(req.query.q),
      }),
    });
  }),
);
