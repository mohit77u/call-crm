import { requireSuperadmin } from "@/lib/auth";
import { CallsBrowser } from "./calls-browser";

export const metadata = { title: "Call Logs" };

export default async function AdminCallsPage() {
  await requireSuperadmin();
  return (
    <>
      <div className="page-head"><div><h1>Call Logs</h1><p className="page-sub">Calls across all companies</p></div></div>
      <CallsBrowser />
    </>
  );
}
