import { requireSuperadmin, getPlatformToken } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { CompaniesBrowser, type CompanyRow } from "./companies-browser";

export const metadata = { title: "Companies" };

export default async function AdminCompaniesPage() {
  await requireSuperadmin();
  const data = await apiFetch<{ companies: CompanyRow[] }>(
    "/api/admin/overview",
    { token: await getPlatformToken() },
  );

  return (
    <>
      <div className="page-head"><div><h1>Companies</h1><p className="page-sub">All customer workspaces, plans and usage</p></div></div>
      <CompaniesBrowser companies={data.companies} />
    </>
  );
}
