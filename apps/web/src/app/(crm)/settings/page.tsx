import { requireAdmin } from "@/lib/auth";
import { regenerateClientCode, updateCompanyName } from "./actions";

export default async function SettingsPage({ searchParams }: PageProps<"/settings">) {
  const admin = await requireAdmin();
  const { welcome, notice } = await searchParams;
  return (
    <>
      <h1>Settings</h1>
      {welcome && <div className="notice">Account created. Share the client code below with your agents, then add them on the Agents page.</div>}
      {notice && !welcome && <div className="notice">{notice}</div>}
      <div className="card">
        <h2>Client code</h2>
        <p className="muted">Every agent enters this code in the Android app, then logs in with their own username and password.</p>
        <div className="code">{admin.clientCode}</div>
        <form action={regenerateClientCode} style={{ marginTop: 12 }}>
          <button className="secondary" type="submit">Generate new code</button>
          <span className="muted" style={{ marginLeft: 8 }}>Phones already logged in stay connected.</span>
        </form>
      </div>
      <div className="card">
        <h2>Company</h2>
        <form action={updateCompanyName} className="form-row">
          <input name="name" defaultValue={admin.companyName} required />
          <button type="submit">Save</button>
        </form>
        <p className="muted">Admin: {admin.name} ({admin.email})</p>
      </div>
    </>
  );
}
