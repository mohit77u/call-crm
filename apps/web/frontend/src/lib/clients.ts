export type ClientRow = {
  id: number;
  companyId: number;
  agentId: number | null;
  agentName?: string | null;
  clientCode: string;
  name: string;
  phone: string;
  email: string;
  address: string | null;
  panCard: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AgentOption = { id: number; name: string; active?: boolean };
