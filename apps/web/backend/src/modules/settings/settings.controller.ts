import { Router } from "express";
import { z } from "zod";
import { asyncHandler, badRequest } from "../../shared/errors";
import { requireAdmin } from "../../middleware/auth";
import { AppDataSource } from "../../database";
import { regenerateClientCode } from "../companies/companies.service";

export const settingsRouter = Router();
settingsRouter.use(requireAdmin);

const nameSchema = z.object({ name: z.string().trim().min(1).max(200) });

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
