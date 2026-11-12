export const CALL_TYPES = ["incoming", "outgoing", "missed", "rejected", "blocked", "voicemail", "unknown"] as const;
export type CallType = (typeof CALL_TYPES)[number];

export const STATUSES = ["connected", "not_connected", "received", "missed", "rejected", "blocked", "other"] as const;
export type CallStatus = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<CallStatus, string> = {
  connected: "Connected",
  not_connected: "Not Connected",
  received: "Received",
  missed: "Missed",
  rejected: "Rejected",
  blocked: "Blocked",
  other: "Other",
};

export function deriveStatus(type: CallType, durationSec: number): CallStatus {
  switch (type) {
    case "outgoing":
      return durationSec > 0 ? "connected" : "not_connected";
    case "incoming":
      return durationSec > 0 ? "received" : "missed";
    case "missed":
      return "missed";
    case "rejected":
      return "rejected";
    case "blocked":
      return "blocked";
    default:
      return "other";
  }
}

export function formatDuration(totalSec: number) {
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

export function formatMinutes(totalSec: number) {
  return `${(totalSec / 60).toFixed(1)} min`;
}

export const TIME_ZONE = process.env.CRM_TIME_ZONE ?? "Asia/Kolkata";

export function formatDateTime(d: Date | string) {
  return new Date(d).toLocaleString("en-IN", { timeZone: TIME_ZONE, dateStyle: "medium", timeStyle: "short" });
}

export function todayInZone() {
  return new Date().toLocaleDateString("en-CA", { timeZone: TIME_ZONE });
}
