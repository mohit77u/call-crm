import { requireAdmin, getAdminToken } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { regenerateClientCode, updateCompanyName } from "./actions";

export const metadata = { title: "Settings" };


export default async function SettingsPage({ searchParams }: PageProps<"/settings">) {
  await requireAdmin();
  const { welcome, notice, error } = await searchParams;
  const settings = await apiFetch<{
    companyName: string;
    clientCode: string;
    adminName: string;
    adminEmail: string;
    features: Record<string, unknown>;
  }>("/api/crm/settings", { token: await getAdminToken() });

  return (
    <>
      <div className="page-head"><div><h1>Settings</h1><p className="page-sub">Company profile and client code</p></div></div>
      {welcome && <div className="notice">Account created. Share the client code below with your agents, then add them on the Agents page.</div>}
      {notice && <div className="notice">{notice}</div>}
      {error && <div className="error">{error}</div>}
      <div className="card">
        <h2>Client code</h2>
        <p className="muted">Every agent enters this code in the Android app, then logs in with their own username and password.</p>
        <div className="code">{settings.clientCode}</div>
        <form action={regenerateClientCode} style={{ marginTop: 12 }}>
          <button className="secondary" type="submit">Generate new code</button>
          <span className="muted" style={{ marginLeft: 8 }}>Phones already logged in stay connected.</span>
        </form>
      </div>
      <div className="card">
        <h2>Company</h2>
        <form action={updateCompanyName} className="form-row">
          <input name="name" defaultValue={settings.companyName} required />
          <button type="submit">Save</button>
        </form>
        <p className="muted">Admin: {settings.adminName} ({settings.adminEmail})</p>
      </div>
    </>
  );
}
