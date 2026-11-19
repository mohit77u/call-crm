import { requireAgent } from "@/lib/auth";
import { ClientsBrowser } from "@/components/clients-browser";
import * as actions from "./actions";

export const metadata = { title: "My clients" };

export default async function AgentClientsPage() {
  await requireAgent();
  return <ClientsBrowser portal="agent" actions={actions} />;
}
