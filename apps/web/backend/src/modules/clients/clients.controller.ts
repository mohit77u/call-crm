import { Router, raw } from "express";
import { z } from "zod";
import { asyncHandler, badRequest } from "../../shared/errors";
import { requireAdmin, requireAgent } from "../../middleware/auth";
import { csvCell, sendCsv } from "../../shared/csv";
import * as clientsService from "./clients.service";

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body ?? {});
  if (!result.success) throw badRequest("Invalid request");
  return result.data;
}

const q = (v: unknown) => String(Array.isArray(v) ? v[0] : (v ?? "")).trim().slice(0, 100);

const clientSchema = z.object({
  clientCode: z.string().max(60).optional(),
  name: z.string().max(200).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().max(200).optional(),
  address: z.string().max(1200).nullish(),
  panCard: z.string().max(30).nullish(),
  agentId: z.number().int().positive().nullish(),
});

// ---------- Agent portal ----------

export const agentClientsRouter = Router();
agentClientsRouter.use(requireAgent);

agentClientsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json({ clients: await clientsService.agentListClients(req.agent!) });
  }),
);

agentClientsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    res.status(201).json({ client: await clientsService.agentCreateClient(req.agent!, parse(clientSchema, req.body)) });
  }),
);

agentClientsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json({ client: await clientsService.agentUpdateClient(req.agent!, Number(req.params.id), parse(clientSchema, req.body)) });
  }),
);

agentClientsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json(await clientsService.agentDeleteClient(req.agent!, Number(req.params.id)));
  }),
);

agentClientsRouter.get(
  "/export.csv",
  asyncHandler(async (req, res) => {
    const rows = await clientsService.agentExportClients(req.agent!);
    sendCsv(res, `my-clients-${new Date().toISOString().slice(0, 10)}.csv`, clientsService.CLIENTS_CSV_HEADER, clientsService.clientExportLines(rows));
  }),
);

agentClientsRouter.post(
  "/import-file",
  raw({ type: "application/octet-stream", limit: "8mb" }),
  asyncHandler(async (req, res) => {
    const buffer = req.body as Buffer;
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw badRequest("Empty file");
    const rec = await clientsService.createClientImport(
      { companyId: req.agent!.companyId, agentId: req.agent!.agentId, adminId: null },
      {
        buffer,
        fileName: q(req.query.fileName) || "import",
        hasHeader: q(req.query.hasHeader) !== "0" && q(req.query.hasHeader) !== "false",
        assign: { mode: "none", agentId: null },
      },
    );
    res.status(201).json({ importId: rec.id, status: "awaiting_mapping", headers: rec.headers, mapping: rec.mapping });
  }),
);

agentClientsRouter.post(
  "/imports/:id/confirm",
  asyncHandler(async (req, res) => {
    const mapping = (req.body?.mapping ?? {}) as Record<string, number>;
    const result = await clientsService.confirmClientImport(req.agent!.companyId, Number(req.params.id), mapping);
    res.json({ status: "completed", ...result });
  }),
);

agentClientsRouter.get(
  "/imports",
  asyncHandler(async (req, res) => {
    res.json({ imports: await clientsService.listClientImports(req.agent!.companyId) });
  }),
);

agentClientsRouter.get(
  "/imports/:id/errors.csv",
  asyncHandler(async (req, res) => {
    const data = await clientsService.getClientImportErrors(req.agent!.companyId, Number(req.params.id));
    sendCsv(
      res,
      `client-import-${req.params.id}-errors.csv`,
      [...data.headers.map(csvCell), "Error"].join(","),
      data.rows.map((r) => [...r.values.map(csvCell), csvCell(r.error)].join(",")),
    );
  }),
);

// ---------- Company admin ----------

export const crmClientsRouter = Router();
crmClientsRouter.use(requireAdmin);

crmClientsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json({
      clients: await clientsService.adminListClients(req.admin!, q(req.query.agent)),
      agents: await clientsService.adminListAgents(req.admin!.companyId),
    });
  }),
);

crmClientsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    res.status(201).json({ client: await clientsService.adminCreateClient(req.admin!, parse(clientSchema, req.body)) });
  }),
);

crmClientsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json({ client: await clientsService.adminUpdateClient(req.admin!, Number(req.params.id), parse(clientSchema, req.body)) });
  }),
);

crmClientsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json(await clientsService.adminDeleteClient(req.admin!, Number(req.params.id)));
  }),
);

crmClientsRouter.get(
  "/export.csv",
  asyncHandler(async (req, res) => {
    const rows = await clientsService.adminExportClients(req.admin!, q(req.query.agent));
    sendCsv(res, `clients-${new Date().toISOString().slice(0, 10)}.csv`, clientsService.CLIENTS_CSV_HEADER, clientsService.clientExportLines(rows));
  }),
);

crmClientsRouter.post(
  "/import-file",
  raw({ type: "application/octet-stream", limit: "8mb" }),
  asyncHandler(async (req, res) => {
    const buffer = req.body as Buffer;
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw badRequest("Empty file");
    const rec = await clientsService.createClientImport(
      { companyId: req.admin!.companyId, agentId: null, adminId: req.admin!.adminId },
      {
        buffer,
        fileName: q(req.query.fileName) || "import",
        hasHeader: q(req.query.hasHeader) !== "0" && q(req.query.hasHeader) !== "false",
        assign: { mode: "none", agentId: null },
      },
    );
    res.status(201).json({ importId: rec.id, status: "awaiting_mapping", headers: rec.headers, mapping: rec.mapping });
  }),
);

crmClientsRouter.post(
  "/imports/:id/confirm",
  asyncHandler(async (req, res) => {
    const mapping = (req.body?.mapping ?? {}) as Record<string, number>;
    const result = await clientsService.confirmClientImport(req.admin!.companyId, Number(req.params.id), mapping);
    res.json({ status: "completed", ...result });
  }),
);

crmClientsRouter.get(
  "/imports",
  asyncHandler(async (req, res) => {
    res.json({ imports: await clientsService.listClientImports(req.admin!.companyId) });
  }),
);

crmClientsRouter.get(
  "/imports/:id/errors.csv",
  asyncHandler(async (req, res) => {
    const data = await clientsService.getClientImportErrors(req.admin!.companyId, Number(req.params.id));
    sendCsv(
      res,
      `client-import-${req.params.id}-errors.csv`,
      [...data.headers.map(csvCell), "Error"].join(","),
      data.rows.map((r) => [...r.values.map(csvCell), csvCell(r.error)].join(",")),
    );
  }),
);
