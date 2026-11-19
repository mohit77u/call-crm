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
import { agentLeadsRouter, crmLeadsRouter } from "./modules/leads/leads.controller";
import { agentClientsRouter, crmClientsRouter } from "./modules/clients/clients.controller";
import { agentNotificationsRouter, crmNotificationsRouter } from "./modules/notifications/notifications.controller";
import { agentTrialsRouter, crmTrialsRouter } from "./modules/trials/trials.controller";
import { agentDashboardRouter } from "./modules/call-logs/calls.controller";

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
  app.use("/api/crm/leads", crmLeadsRouter);
  app.use("/api/crm/clients", crmClientsRouter);
  app.use("/api/crm/trials", crmTrialsRouter);
  app.use("/api/crm/notifications", crmNotificationsRouter);
  app.use("/api/agent/leads", agentLeadsRouter);
  app.use("/api/agent/clients", agentClientsRouter);
  app.use("/api/agent/trials", agentTrialsRouter);
  app.use("/api/agent/dashboard", agentDashboardRouter);
  app.use("/api/agent/notifications", agentNotificationsRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/contact", contactRouter);

  app.use((_req, res) => res.status(404).json({ error: "Not found" }));
  app.use(errorHandler);

  return app;
}
