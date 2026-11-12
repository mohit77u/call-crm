import { Router } from "express";
import { asyncHandler } from "../../shared/errors";
import { requireAdmin } from "../../middleware/auth";
import { requestAllDeviceSync, requestDeviceSync, revokeDevice } from "../agents/agents.service";

export const devicesRouter = Router();
devicesRouter.use(requireAdmin);

devicesRouter.post(
  "/sync-all",
  asyncHandler(async (req, res) => {
    res.json(await requestAllDeviceSync(req.admin!.companyId));
  }),
);

devicesRouter.post(
  "/:id/revoke",
  asyncHandler(async (req, res) => {
    res.json(await revokeDevice(req.admin!.companyId, Number(req.params.id)));
  }),
);

devicesRouter.post(
  "/:id/sync-request",
  asyncHandler(async (req, res) => {
    res.json(await requestDeviceSync(req.admin!.companyId, Number(req.params.id)));
  }),
);
