import { Router } from "express";
import { z } from "zod";
import { asyncHandler, badRequest } from "../../shared/errors";
import { requireAdmin } from "../../middleware/auth";
import * as agentsService from "./agents.service";

export const agentsRouter = Router();
agentsRouter.use(requireAdmin);

const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,30}$/),
  phone: z.string().trim().min(1).max(30),
  password: z.string().min(6).max(200),
});

const activeSchema = z.object({ active: z.boolean() });
const passwordSchema = z.object({ password: z.string().min(6).max(200) });

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body ?? {});
  if (!result.success) throw badRequest("Invalid request");
  return result.data;
}

agentsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await agentsService.listAgentsWithDevices(req.admin!.companyId));
  }),
);

agentsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = parse(createSchema, req.body);
    res.json(await agentsService.createAgent(req.admin!, {
      name: input.name,
      username: input.username,
      phone: input.phone.trim(),
      password: input.password,
    }));
  }),
);

agentsRouter.post(
  "/:id/active",
  asyncHandler(async (req, res) => {
    const { active } = parse(activeSchema, req.body);
    res.json(await agentsService.setAgentActive(req.admin!.companyId, Number(req.params.id), active));
  }),
);

agentsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json(await agentsService.deleteAgent(req.admin!.companyId, Number(req.params.id)));
  }),
);

agentsRouter.post(
  "/:id/password",
  asyncHandler(async (req, res) => {
    const { password } = parse(passwordSchema, req.body);
    res.json(await agentsService.resetAgentPassword(req.admin!.companyId, Number(req.params.id), password));
  }),
);
