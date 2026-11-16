import { AppDataSource } from "../../database";
import type { AdminContext, AgentContext } from "../../middleware/auth";

export type NotificationItem = {
  id: number;
  type: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

const COLS = `id, type, message, link, read_at AS "readAt", created_at AS "createdAt"`;

type NewNotification = {
  companyId: number;
  recipientType: "agent" | "admin";
  agentId: number | null;
  adminId: number | null;
  type: string;
  message: string;
  link: string | null;
};

async function insertNotifications(rows: NewNotification[]) {
  if (rows.length === 0) return;
  const params: unknown[] = [];
  const values = rows.map((r) => {
    const b = params.length;
    params.push(r.companyId, r.recipientType, r.agentId, r.adminId, r.type, r.message, r.link);
    return `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7})`;
  });
  await AppDataSource.query(
    `INSERT INTO notifications (company_id, recipient_type, agent_id, admin_id, type, message, link)
     VALUES ${values.join(",")}`,
    params,
  );
}

// One notification row per agent.
export async function notifyAgents(companyId: number, agentIds: number[], type: string, message: string, link?: string) {
  const ids = [...new Set(agentIds)].filter((id) => Number.isInteger(id) && id > 0);
  if (ids.length === 0) return;
  const active = await AppDataSource.query(
    "SELECT id FROM agents WHERE company_id = $1 AND id = ANY($2::int[]) AND deleted_at IS NULL AND active",
    [companyId, ids],
  );
  const activeIds = (active as { id: number }[]).map((a) => a.id);
  if (activeIds.length === 0) return;
  await insertNotifications(
    activeIds.map((agentId) => ({ companyId, recipientType: "agent" as const, agentId, adminId: null, type, message, link: link ?? null })),
  );
}

// One notification row per company admin.
export async function notifyAdmins(companyId: number, type: string, message: string, link?: string) {
  const admins = await AppDataSource.query("SELECT id FROM admins WHERE company_id = $1 AND deleted_at IS NULL", [companyId]);
  await insertNotifications(
    admins.map((a: { id: number }) => ({
      companyId,
      recipientType: "admin" as const,
      agentId: null,
      adminId: a.id,
      type,
      message,
      link: link ?? null,
    })),
  );
}

function mapRows(rows: Record<string, unknown>[]): NotificationItem[] {
  return rows.map((r) => ({
    id: Number(r.id),
    type: String(r.type),
    message: String(r.message),
    link: (r.link as string | null) ?? null,
    read: r.readAt != null,
    createdAt: String(r.createdAt),
  }));
}

export async function agentListNotifications(agent: AgentContext) {
  const [notifications, unread] = await Promise.all([
    AppDataSource.query(`SELECT ${COLS} FROM notifications WHERE agent_id = $1 ORDER BY created_at DESC LIMIT 20`, [agent.agentId]),
    AppDataSource.query("SELECT count(*)::int AS n FROM notifications WHERE agent_id = $1 AND read_at IS NULL", [agent.agentId]),
  ]);
  return { notifications: mapRows(notifications), unread: unread[0]?.n ?? 0 };
}

export async function agentMarkNotificationsRead(agent: AgentContext, ids?: number[]) {
  if (ids && ids.length > 0) {
    await AppDataSource.query(
      "UPDATE notifications SET read_at = now() WHERE agent_id = $1 AND id = ANY($2::int[]) AND read_at IS NULL",
      [agent.agentId, ids],
    );
  } else {
    await AppDataSource.query("UPDATE notifications SET read_at = now() WHERE agent_id = $1 AND read_at IS NULL", [agent.agentId]);
  }
}

export async function adminListNotifications(admin: AdminContext) {
  const [notifications, unread] = await Promise.all([
    AppDataSource.query(`SELECT ${COLS} FROM notifications WHERE admin_id = $1 ORDER BY created_at DESC LIMIT 20`, [admin.adminId]),
    AppDataSource.query("SELECT count(*)::int AS n FROM notifications WHERE admin_id = $1 AND read_at IS NULL", [admin.adminId]),
  ]);
  return { notifications: mapRows(notifications), unread: unread[0]?.n ?? 0 };
}

export async function adminMarkNotificationsRead(admin: AdminContext, ids?: number[]) {
  if (ids && ids.length > 0) {
    await AppDataSource.query(
      "UPDATE notifications SET read_at = now() WHERE admin_id = $1 AND id = ANY($2::int[]) AND read_at IS NULL",
      [admin.adminId, ids],
    );
  } else {
    await AppDataSource.query("UPDATE notifications SET read_at = now() WHERE admin_id = $1 AND read_at IS NULL", [admin.adminId]);
  }
}
