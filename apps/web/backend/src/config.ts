import "dotenv/config";

function required(name: string, fallback?: string) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const config = {
  port: Number(process.env.PORT || 4000),
  databaseUrl: required("DATABASE_URL"),
  authSecret: (() => {
    const secret = process.env.AUTH_SECRET;
    if (!secret && process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET is required in production");
    }
    return secret ?? "dev-only-secret-change-me";
  })(),
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL ?? "30m",
  refreshTokenTtl: process.env.REFRESH_TOKEN_TTL ?? "180d",
  corsOrigins: (process.env.CORS_ORIGIN ?? "http://localhost:3050")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  appUrl: (process.env.APP_URL ?? "http://localhost:3050").replace(/\/$/, ""),
  // Public URL of the logo used in emails. Defaults to <appUrl>/logo.png;
  // set LOGO_URL to override (e.g. a CDN-hosted image).
  logoUrl: (process.env.LOGO_URL?.trim() || "").replace(/\/+$/, "") ||
    `${(process.env.APP_URL ?? "http://localhost:3050").replace(/\/+$/, "")}/logo.png`,
  // Public URL of this API as seen from the internet — used for startup logs.
  // Set PUBLIC_URL explicitly, or it is derived from platform env vars.
  publicUrl: (() => {
    const explicit = process.env.PUBLIC_URL?.trim().replace(/\/+$/, "");
    if (explicit) return explicit;
    const railway = process.env.RAILWAY_PUBLIC_DOMAIN?.trim();
    if (railway) return `https://${railway}`;
    const render = process.env.RENDER_EXTERNAL_URL?.trim().replace(/\/+$/, "");
    if (render) return render;
    return "";
  })(),
  timeZone: process.env.CRM_TIME_ZONE ?? "Asia/Kolkata",
  superadminEmails: (process.env.SUPERADMIN_EMAILS ?? process.env.SUPERADMIN_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  superadminPassword: process.env.SUPERADMIN_PASSWORD ?? "",
  contactTo: process.env.CONTACT_TO?.trim() || "mohiit77u@gmail.com",
  redisUrl: (() => {
    const url = process.env.REDIS_URL?.trim();
    if (url) return url;
    const host = process.env.REDIS_HOST?.trim();
    if (!host) return "";
    const port = process.env.REDIS_PORT?.trim() || "6379";
    const user = process.env.REDIS_USERNAME?.trim();
    const pass = process.env.REDIS_PASSWORD ?? "";
    const scheme = process.env.REDIS_SCHEME?.trim() || "redis";
    const auth = user ? `${encodeURIComponent(user)}:${encodeURIComponent(pass)}@` : pass ? `:${encodeURIComponent(pass)}@` : "";
    return `${scheme}://${auth}${host}:${port}`;
  })(),
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true" || Number(process.env.SMTP_PORT) === 465,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
  },
};
