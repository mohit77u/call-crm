import { config } from "../config";

// Branded HTML email wrapper — logo + card layout, works in major clients.
export function emailShell(title: string, bodyHtml: string) {
  const logoUrl = `${config.appUrl}/logo.png`;
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="text-align:center;margin-bottom:24px;">
      <img src="${logoUrl}" alt="Call CRM" width="56" height="56" style="border-radius:14px;" />
      <div style="font-size:20px;font-weight:800;color:#1e1b4b;margin-top:10px;">Call CRM</div>
    </div>
    <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:28px;box-shadow:0 4px 16px rgba(15,23,42,0.06);">
      <h1 style="margin:0 0 18px;font-size:18px;color:#0f172a;">${title}</h1>
      ${bodyHtml}
    </div>
    <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:20px;">
      Call CRM &middot; <a href="${config.appUrl}" style="color:#6366f1;">${config.appUrl.replace(/^https?:\/\//, "")}</a>
    </p>
  </div>
</body></html>`;
}

export function emailRows(rows: [string, string][]) {
  return `<table style="width:100%;border-collapse:collapse;font-size:14px;">${rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:9px 0;color:#64748b;border-bottom:1px solid #f1f5f9;width:38%;">${k}</td><td style="padding:9px 0;color:#0f172a;font-weight:600;border-bottom:1px solid #f1f5f9;">${v}</td></tr>`,
    )
    .join("")}</table>`;
}
