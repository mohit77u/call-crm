export const LEAD_STATUSES = ["new", "contacted", "interested", "follow_up", "converted", "lost", "do_not_call"] as const;
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

export function leadStatusLabel(s: string | null | undefined) {
  return s && s in LEAD_STATUS_LABELS ? LEAD_STATUS_LABELS[s as LeadStatus] : s ?? "-";
}

export type LeadRow = {
  id: number;
  companyId: number;
  assignedAgentId: number | null;
  requestedByAgentId: number | null;
  createdByType: string;
  createdById: number;
  source: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  status: string;
  accountCreated: boolean;
  requestStatus: "pending" | "approved" | "rejected" | null;
  assignedAt: string | null;
  lastContactedAt: string | null;
  createdAt: string;
  updatedAt: string;
  agentName?: string | null;
};

export const REQUEST_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};
