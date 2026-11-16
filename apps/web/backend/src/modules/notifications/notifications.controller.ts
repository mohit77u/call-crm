import { Router } from "express";
import { z } from "zod";
import { asyncHandler, badRequest } from "../../shared/errors";
import { requireAdmin, requireAgent } from "../../middleware/auth";
import * as notificationsService from "./notifications.service";

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body ?? {});
  if (!result.success) throw badRequest("Invalid request");
  return result.data;
}

const readSchema = z.object({
  ids: z.array(z.number().int().positive()).max(100).optional(),
});

// ---------- Agent portal ----------

export const agentNotificationsRouter = Router();
agentNotificationsRouter.use(requireAgent);

agentNotificationsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await notificationsService.agentListNotifications(req.agent!));
  }),
);

agentNotificationsRouter.post(
  "/read",
  asyncHandler(async (req, res) => {
    const { ids } = parse(readSchema, req.body);
    await notificationsService.agentMarkNotificationsRead(req.agent!, ids);
    res.json({ ok: true });
  }),
);

// ---------- Company admin ----------

export const crmNotificationsRouter = Router();
crmNotificationsRouter.use(requireAdmin);

crmNotificationsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await notificationsService.adminListNotifications(req.admin!));
  }),
);

crmNotificationsRouter.post(
  "/read",
  asyncHandler(async (req, res) => {
    const { ids } = parse(readSchema, req.body);
    await notificationsService.adminMarkNotificationsRead(req.admin!, ids);
    res.json({ ok: true });
  }),
);
