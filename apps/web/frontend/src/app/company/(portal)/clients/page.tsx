import { ClientsBrowser } from "@/components/clients-browser";
import * as actions from "./actions";

export const metadata = { title: "Clients" };

export default function CrmClientsPage() {
  return <ClientsBrowser portal="company" actions={actions} />;
}
