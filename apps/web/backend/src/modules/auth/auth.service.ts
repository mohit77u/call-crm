import { createHash, randomBytes } from "node:crypto";
import { AppDataSource } from "../../database";
import { checkPassword, hashPassword } from "../../shared/password";
import { signAdminToken, signAgentToken, signPlatformToken, signRefreshToken, verifyToken, type RefreshToken } from "../../shared/jwt";
import { config } from "../../config";
import { normalizeClientCode } from "../../shared/clientCode";
import { mailConfigured, sendMail } from "../../shared/mail";
import { emailShell } from "../../shared/emailTemplate";
import { badRequest, unauthorized } from "../../shared/errors";
import { normalizeFeatures } from "../../shared/features";

export async function adminLogin(email: string, password: string) {
  const rows = await AppDataSource.query(
    `SELECT a.id AS admin_id, a.name, a.email, a.password_hash,
            c.id AS company_id, c.name AS company_name, c.client_code, c.features
     FROM admins a JOIN companies c ON c.id = a.company_id
     WHERE a.email = $1`,
    [email],
  );
  const row = rows[0];
  if (!row || !(await checkPassword(password, row.password_hash))) {
    throw unauthorized("Wrong email or password");
  }
  const token = signAdminToken({ adminId: row.admin_id, companyId: row.company_id });
  const refreshToken = await issueSession("admin", row.admin_id);
  return {
    token,
    refreshToken,
    admin: {
      id: row.admin_id,
      name: row.name,
      email: row.email,
      companyId: row.company_id,
      companyName: row.company_name,
      clientCode: row.client_code,
      features: normalizeFeatures(row.features),
    },
  };
}

export async function agentLogin(clientCode: string, username: string, password: string) {
  const rows = await AppDataSource.query(
    `SELECT a.id AS agent_id, a.name, a.username, a.password_hash, a.active,
            c.id AS company_id, c.name AS company_name, c.client_code, c.features
     FROM agents a JOIN companies c ON c.id = a.company_id
     WHERE c.client_code = $1 AND a.username = $2`,
    [normalizeClientCode(clientCode), username.trim().toLowerCase()],
  );
  const row = rows[0];
  if (!row || !row.active || !(await checkPassword(password, row.password_hash))) {
    throw unauthorized("Wrong username or password");
  }
  const token = signAgentToken({ agentId: row.agent_id, companyId: row.company_id });
  const refreshToken = await issueSession("agent", row.agent_id);
  return {
    token,
    refreshToken,
    agent: {
      id: row.agent_id,
      name: row.name,
      username: row.username,
      companyId: row.company_id,
      companyName: row.company_name,
      clientCode: row.client_code,
      features: normalizeFeatures(row.features),
    },
  };
}

export async function platformLogin(email: string, password: string) {
  const rows = await AppDataSource.query("SELECT id, name, email, password_hash FROM superadmins WHERE email = $1", [email]);
  const row = rows[0];
  if (!row || !(await checkPassword(password, row.password_hash))) {
    throw unauthorized("Wrong email or password");
  }
  const token = signPlatformToken({ superadminId: row.id });
  const refreshToken = await issueSession("platform", row.id);
  return { token, refreshToken, superadmin: { id: row.id, name: row.name, email: row.email } };
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function tokenExpiry(token: string): Date {
  const payload = verifyToken(token) as { exp?: number } | null;
  return payload?.exp ? new Date(payload.exp * 1000) : new Date(Date.now() + 180 * 86400_000);
}

async function issueSession(role: "admin" | "platform" | "agent", userId: number) {
  const refreshToken = signRefreshToken({ role, userId });
  await AppDataSource.query(
    "INSERT INTO refresh_tokens (role, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)",
    [role, userId, tokenHash(refreshToken), tokenExpiry(refreshToken)],
  );
  return refreshToken;
}

export async function refreshSession(refreshToken: string) {
  const payload = verifyToken<RefreshToken>(refreshToken);
  if (!payload || payload.typ !== "refresh") throw unauthorized("Invalid session");

  const rows = await AppDataSource.query(
    "SELECT id FROM refresh_tokens WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()",
    [tokenHash(refreshToken)],
  );
  if (!rows[0]) throw unauthorized("Session expired — please log in again");

  // Rotate: revoke the used token, issue a fresh access + refresh pair.
  await AppDataSource.query("UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1", [rows[0].id]);

  let token: string;
  if (payload.role === "admin") {
    const admins = await AppDataSource.query("SELECT company_id FROM admins WHERE id = $1", [payload.userId]);
    if (!admins[0]) throw unauthorized("Session expired — please log in again");
    token = signAdminToken({ adminId: payload.userId, companyId: admins[0].company_id });
  } else if (payload.role === "platform") {
    const platforms = await AppDataSource.query("SELECT 1 FROM superadmins WHERE id = $1", [payload.userId]);
    if (!platforms[0]) throw unauthorized("Session expired — please log in again");
    token = signPlatformToken({ superadminId: payload.userId });
  } else {
    const agents = await AppDataSource.query("SELECT company_id FROM agents WHERE id = $1 AND active", [payload.userId]);
    if (!agents[0]) throw unauthorized("Session expired — please log in again");
    token = signAgentToken({ agentId: payload.userId, companyId: agents[0].company_id });
  }
  const newRefreshToken = await issueSession(payload.role, payload.userId);
  return { token, refreshToken: newRefreshToken };
}

export async function logoutSession(refreshToken: string) {
  await AppDataSource.query(
    "UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL",
    [tokenHash(refreshToken)],
  );
}

export async function requestPasswordReset(email: string) {
  if (!mailConfigured()) throw badRequest("Email is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS.");

  const companyAdmin = await AppDataSource.query("SELECT 1 FROM admins WHERE email = $1", [email]);
  const platform = companyAdmin.length === 0
    ? await AppDataSource.query("SELECT 1 FROM superadmins WHERE email = $1", [email])
    : [];
  const role = companyAdmin.length > 0 ? "admin" : platform.length > 0 ? "superadmin" : null;
  if (!role) return; // do not reveal whether the email exists

  const token = randomBytes(32).toString("hex");
  await AppDataSource.query("DELETE FROM password_resets WHERE email = $1 AND role = $2 AND used_at IS NULL", [email, role]);
  await AppDataSource.query(
    "INSERT INTO password_resets (email, role, token_hash, expires_at) VALUES ($1, $2, $3, now() + interval '1 hour')",
    [email, role, tokenHash(token)],
  );
  const resetPath = role === "superadmin" ? "/admin/reset-password" : "/company/reset-password";
  const link = `${config.appUrl}${resetPath}?token=${token}`;
  await sendMail({
    to: email,
    subject: "Reset your Call CRM password",
    text: `Reset your password using this link (valid for 1 hour):\n\n${link}\n\nIf you did not ask for this, ignore this email.`,
    html: emailShell(
      "Reset your password",
      `<p style="font-size:14px;color:#334155;line-height:1.6;margin:0 0 18px;">We got a request to reset your Call CRM password. Click the button below to choose a new one — the link is valid for <b>1 hour</b>.</p>
       <p style="text-align:center;margin:0 0 18px;"><a href="${link}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px;">Reset password</a></p>
       <p style="font-size:12px;color:#94a3b8;line-height:1.6;margin:0;word-break:break-all;">Or paste this link in your browser:<br/>${link}</p>
       <p style="font-size:12px;color:#94a3b8;margin:16px 0 0;">If you did not ask for this, you can safely ignore this email.</p>`,
    ),
  });
}

export async function resetPassword(token: string, password: string) {
  if (password.length < 8) throw badRequest("Password must be at least 8 characters");
  const rows = await AppDataSource.query(
    "SELECT id, email, role FROM password_resets WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()",
    [tokenHash(token)],
  );
  const row = rows[0];
  if (!row) throw badRequest("This reset link is invalid or has expired");

  const hash = await hashPassword(password);
  if (row.role === "superadmin") {
    await AppDataSource.query("UPDATE superadmins SET password_hash = $1 WHERE email = $2", [hash, row.email]);
  } else {
    await AppDataSource.query("UPDATE admins SET password_hash = $1 WHERE email = $2", [hash, row.email]);
  }
  await AppDataSource.query("UPDATE password_resets SET used_at = now() WHERE id = $1", [row.id]);
  return { role: row.role };
}
