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
  corsOrigins: (process.env.CORS_ORIGIN ?? "http://localhost:3050")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  appUrl: (process.env.APP_URL ?? "http://localhost:3050").replace(/\/$/, ""),
  timeZone: process.env.CRM_TIME_ZONE ?? "Asia/Kolkata",
  superadminEmail: process.env.SUPERADMIN_EMAIL?.trim().toLowerCase(),
  superadminPassword: process.env.SUPERADMIN_PASSWORD ?? "",
  contactTo: process.env.CONTACT_TO?.trim() || "mohiit77u@gmail.com",
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true" || Number(process.env.SMTP_PORT) === 465,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
  },
};
