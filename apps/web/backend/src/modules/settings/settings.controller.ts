import { Router } from "express";
import { z } from "zod";
import { asyncHandler, badRequest, unauthorized } from "../../shared/errors";
import { requireAdmin } from "../../middleware/auth";
import { AppDataSource } from "../../database";
import { regenerateClientCode } from "../companies/companies.service";
import { checkPassword, hashPassword } from "../../shared/password";

export const settingsRouter = Router();
settingsRouter.use(requireAdmin);

const nameSchema = z.object({ name: z.string().trim().min(1).max(200) });
const profileSchema = z.object({ name: z.string().trim().min(1, "Name is required").max(100) });
const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters").max(100),
});

settingsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const a = req.admin!;
    res.json({
      companyName: a.companyName,
      clientCode: a.clientCode,
      adminName: a.name,
      adminEmail: a.email,
      features: a.features,
    });
  }),
);

settingsRouter.post(
  "/name",
  asyncHandler(async (req, res) => {
    const result = nameSchema.safeParse(req.body);
    if (!result.success) throw badRequest("Invalid request");
    await AppDataSource.query("UPDATE companies SET name = $2 WHERE id = $1", [req.admin!.companyId, result.data.name]);
    res.json({ ok: true });
  }),
);

settingsRouter.post(
  "/client-code",
  asyncHandler(async (req, res) => {
    const clientCode = await regenerateClientCode(req.admin!.companyId);
    res.json({ ok: true, clientCode });
  }),
);

settingsRouter.patch(
  "/profile",
  asyncHandler(async (req, res) => {
    const result = profileSchema.safeParse(req.body);
    if (!result.success) throw badRequest(result.error.issues[0]?.message ?? "Invalid request");
    await AppDataSource.query("UPDATE admins SET name = $2 WHERE id = $1", [req.admin!.adminId, result.data.name]);
    res.json({ ok: true });
  }),
);

settingsRouter.post(
  "/password",
  asyncHandler(async (req, res) => {
    const result = passwordSchema.safeParse(req.body);
    if (!result.success) throw badRequest(result.error.issues[0]?.message ?? "Invalid request");
    const rows = await AppDataSource.query("SELECT password_hash FROM admins WHERE id = $1", [req.admin!.adminId]);
    const row = rows[0];
    if (!row || !(await checkPassword(result.data.currentPassword, row.password_hash))) {
      throw unauthorized("Current password is wrong");
    }
    await AppDataSource.query("UPDATE admins SET password_hash = $2 WHERE id = $1", [
      req.admin!.adminId,
      await hashPassword(result.data.newPassword),
    ]);
    res.json({ ok: true });
  }),
);
