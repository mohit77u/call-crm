import { Router } from "express";
import { z } from "zod";
import { asyncHandler, badRequest } from "../../shared/errors";
import { appAuthLimiter } from "../../middleware/rateLimit";
import { requireAppDevice, requireFeature } from "../../middleware/auth";
import * as appService from "./app.service";

export const appRouter = Router();

const verifySchema = z.object({ clientCode: z.string().min(1).max(50) });
const loginSchema = z.object({
  clientCode: z.string().min(1).max(50),
  username: z.string().trim().toLowerCase().min(1).max(100),
  password: z.string().min(1).max(200),
  device: z.record(z.unknown()).optional(),
});
const callsSchema = z.object({ calls: z.array(z.record(z.unknown())).max(500).optional() });
const heartbeatSchema = z.object({
  permissionsOk: z.boolean().optional(),
  appVersion: z.string().max(100).optional(),
  location: z
    .object({
      lat: z.number(),
      lng: z.number(),
      accuracy: z.number().optional(),
      time: z.number().optional(),
    })
    .partial()
    .nullish(),
});

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body ?? {});
  if (!result.success) throw badRequest("Invalid request");
  return result.data;
}

appRouter.post(
  "/verify-client",
  appAuthLimiter,
  asyncHandler(async (req, res) => {
    const { clientCode } = parse(verifySchema, req.body);
    res.json(await appService.verifyClient(clientCode));
  }),
);

appRouter.post(
  "/login",
  appAuthLimiter,
  asyncHandler(async (req, res) => {
    const { clientCode, username, password, device } = parse(loginSchema, req.body);
    res.json(await appService.appLogin(clientCode, username, password, device ?? {}));
  }),
);

appRouter.post(
  "/calls",
  requireAppDevice,
  requireFeature("callSync"),
  asyncHandler(async (req, res) => {
    const { calls } = parse(callsSchema, req.body);
    res.json(await appService.uploadCalls(req.appSession!, calls ?? []));
  }),
);

appRouter.post(
  "/heartbeat",
  requireAppDevice,
  asyncHandler(async (req, res) => {
    const body = parse(heartbeatSchema, req.body);
    res.json(await appService.heartbeat(req.appSession!, body));
  }),
);

appRouter.get(
  "/me",
  requireAppDevice,
  asyncHandler(async (req, res) => {
    res.json(await appService.me(req.appSession!));
  }),
);
