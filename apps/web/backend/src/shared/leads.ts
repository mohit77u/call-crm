export const LEAD_STATUSES = [
  "new",
  "contacted",
  "interested",
  "follow_up",
  "converted",
  "lost",
  "do_not_call",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  interested: "Interested",
  follow_up: "Follow up",
  converted: "Converted",
  lost: "Lost",
  do_not_call: "Do not call",
};

export function isLeadStatus(v: unknown): v is LeadStatus {
  return typeof v === "string" && (LEAD_STATUSES as readonly string[]).includes(v);
}
