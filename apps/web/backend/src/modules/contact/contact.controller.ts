import { Router } from "express";
import { asyncHandler } from "../../shared/errors";
import { contactLimiter } from "../../middleware/rateLimit";
import { submitEnquiry } from "./contact.service";

export const contactRouter = Router();

contactRouter.post(
  "/",
  contactLimiter,
  asyncHandler(async (req, res) => {
    res.json(await submitEnquiry(req.body));
  }),
);
