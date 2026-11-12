import type { Response } from "express";

export function csvCell(value: unknown) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function sendCsv(res: Response, filename: string, header: string, rows: string[]) {
  res.setHeader("content-type", "text/csv; charset=utf-8");
  res.setHeader("content-disposition", `attachment; filename="${filename}"`);
  res.send([header, ...rows].join("\n"));
}
