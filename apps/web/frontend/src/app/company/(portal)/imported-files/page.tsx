import { requireAdmin, getAdminToken } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { ImportsBrowser, type ImportRow } from "./imports-browser";

export const metadata = { title: "Imported files" };

export default async function ImportedFilesPage() {
  await requireAdmin();
  const token = await getAdminToken();
  const [leads, clients] = await Promise.all([
    apiFetch<{ imports: ImportRow[] }>("/api/crm/leads/imports", { token }),
    apiFetch<{ imports: ImportRow[] }>("/api/crm/clients/imports", { token }),
  ]);
  const imports = [
    ...(leads.imports ?? []).map((r) => ({ ...r, type: "lead" as const })),
    ...(clients.imports ?? []).map((r) => ({ ...r, type: "client" as const })),
  ].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  return <ImportsBrowser initial={imports} />;
}
