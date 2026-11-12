import express from "express";
import helmet from "helmet";
import cors from "cors";
import { config } from "./config";
import { errorHandler } from "./shared/errors";
import { authRouter } from "./modules/auth/auth.controller";
import { appRouter } from "./modules/app/app.controller";
import { agentsRouter } from "./modules/agents/agents.controller";
import { devicesRouter } from "./modules/devices/devices.controller";
import { callsRouter, dashboardRouter } from "./modules/call-logs/calls.controller";
import { settingsRouter } from "./modules/settings/settings.controller";
import { adminRouter } from "./modules/superadmin/superadmin.controller";
import { contactRouter } from "./modules/contact/contact.controller";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1); // behind Render/Vercel proxy — needed for correct client IPs in rate limits
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin: config.corsOrigins,
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["content-type", "authorization"],
      maxAge: 600,
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use("/api/auth", authRouter);
  app.use("/api/app", appRouter);
  app.use("/api/crm/agents", agentsRouter);
  app.use("/api/crm/devices", devicesRouter);
  app.use("/api/crm/calls", callsRouter);
  app.use("/api/crm/dashboard", dashboardRouter);
  app.use("/api/crm/settings", settingsRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/contact", contactRouter);

  app.use((_req, res) => res.status(404).json({ error: "Not found" }));
  app.use(errorHandler);

  return app;
}
