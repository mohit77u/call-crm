import { Router } from "express";
import { z } from "zod";
import { asyncHandler, badRequest } from "../../shared/errors";
import { authLimiter } from "../../middleware/rateLimit";
import { requireAdmin, requireAgent, requireSuperadmin } from "../../middleware/auth";
import { normalizeFeatures } from "../../shared/features";
import * as authService from "./auth.service";

export const authRouter = Router();

const emailSchema = z.string().trim().toLowerCase().email().max(200);
const passwordSchema = z.string().min(1).max(200);

const loginSchema = z.object({ email: emailSchema, password: passwordSchema });
const agentLoginSchema = z.object({
  clientCode: z.string().trim().min(1).max(50),
  username: z.string().trim().toLowerCase().min(1).max(100),
  password: z.string().min(1).max(200),
});
const refreshSchema = z.object({ refreshToken: z.string().min(1).max(4000) });
const forgotSchema = z.object({ email: emailSchema });
const resetSchema = z.object({ token: z.string().min(1).max(200), password: z.string().min(8).max(200) });
const agentProfileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  phone: z.string().trim().max(20).nullish(),
});
const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters").max(100),
});

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) throw badRequest("Invalid request");
  return result.data;
}

authRouter.post(
  "/admin/login",
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = parse(loginSchema, req.body);
    res.json(await authService.adminLogin(email, password));
  }),
);

authRouter.post(
  "/refresh",
  authLimiter,
  asyncHandler(async (req, res) => {
    const { refreshToken } = parse(refreshSchema, req.body);
    res.json(await authService.refreshSession(refreshToken));
  }),
);

authRouter.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const { refreshToken } = parse(refreshSchema, req.body);
    await authService.logoutSession(refreshToken);
    res.json({ ok: true });
  }),
);

authRouter.post(
  "/agent/login",
  authLimiter,
  asyncHandler(async (req, res) => {
    const input = parse(agentLoginSchema, req.body);
    res.json(await authService.agentLogin(input.clientCode, input.username, input.password));
  }),
);

authRouter.patch(
  "/agent/profile",
  requireAgent,
  asyncHandler(async (req, res) => {
    const input = parse(agentProfileSchema, req.body);
    res.json(await authService.agentUpdateProfile(req.agent!, input));
  }),
);

authRouter.post(
  "/agent/password",
  requireAgent,
  asyncHandler(async (req, res) => {
    const input = parse(passwordChangeSchema, req.body);
    res.json(await authService.agentChangePassword(req.agent!, input.currentPassword, input.newPassword));
  }),
);

authRouter.get(
  "/agent/me",
  requireAgent,
  asyncHandler(async (req, res) => {
    const a = req.agent!;
    res.json({
      agent: {
        id: a.agentId,
        name: a.name,
        username: a.username,
        phone: a.phone,
        companyId: a.companyId,
        companyName: a.companyName,
        clientCode: a.clientCode,
        features: normalizeFeatures(a.features),
      },
    });
  }),
);

authRouter.get(
  "/admin/me",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const a = req.admin!;
    res.json({
      admin: {
        id: a.adminId,
        name: a.name,
        email: a.email,
        companyId: a.companyId,
        companyName: a.companyName,
        clientCode: a.clientCode,
        features: normalizeFeatures(a.features),
      },
    });
  }),
);

authRouter.post(
  "/platform/login",
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = parse(loginSchema, req.body);
    res.json(await authService.platformLogin(email, password));
  }),
);

authRouter.get(
  "/platform/me",
  requireSuperadmin,
  asyncHandler(async (req, res) => {
    res.json({ superadmin: req.platform });
  }),
);

authRouter.post(
  "/forgot-password",
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email } = parse(forgotSchema, req.body);
    await authService.requestPasswordReset(email);
    res.json({ ok: true });
  }),
);

authRouter.post(
  "/reset-password",
  authLimiter,
  asyncHandler(async (req, res) => {
    const { token, password } = parse(resetSchema, req.body);
    const { role } = await authService.resetPassword(token, password);
    res.json({ ok: true, role });
  }),
);
