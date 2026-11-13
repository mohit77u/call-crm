import { requireAdmin, hasFeature } from "@/lib/auth";
import { CallsBrowser } from "./calls-browser";

export const metadata = { title: "Call logs" };

export default async function CallsPage() {
  const admin = await requireAdmin();
  return <CallsBrowser canExport={hasFeature(admin, "exports")} />;
}
