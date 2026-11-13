import { requireAdmin, getAdminToken } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { SettingsBrowser } from "./settings-browser";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireAdmin();
  const settings = await apiFetch<{
    companyName: string;
    clientCode: string;
    adminName: string;
    adminEmail: string;
  }>("/api/crm/settings", { token: await getAdminToken() });

  return (
    <>
      <div className="page-head"><div><h1>Settings</h1><p className="page-sub">Company profile and client code</p></div></div>
      <SettingsBrowser
        companyName={settings.companyName}
        clientCode={settings.clientCode}
        adminName={settings.adminName}
        adminEmail={settings.adminEmail}
      />
    </>
  );
}
