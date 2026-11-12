import nodemailer from "nodemailer";
import { config } from "../config";

export function mailConfigured() {
  return Boolean(config.smtp.host && config.smtp.user && config.smtp.pass);
}

export async function sendMail(opts: { to: string; subject: string; text: string; html?: string }) {
  if (!mailConfigured()) throw new Error("Email is not configured");
  const transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: { user: config.smtp.user, pass: config.smtp.pass },
  });
  await transporter.sendMail({
    from: config.smtp.from || config.smtp.user,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  });
}
