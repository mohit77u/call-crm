import { requireAdmin, getAdminToken } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { ImportsBrowser, type ImportRow } from "./imports-browser";

export const metadata = { title: "Imported files" };

export default async function ImportedFilesPage() {
  await requireAdmin();
  const data = await apiFetch<{ imports: ImportRow[] }>("/api/crm/leads/imports", { token: await getAdminToken() });
  return <ImportsBrowser initial={data.imports ?? []} />;
}
