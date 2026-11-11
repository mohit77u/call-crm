import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { formatDateTime } from "@/lib/calls";
import { createAgent, resetAgentPassword, revokeDevice, setAgentActive } from "./actions";

type Agent = { id: number; name: string; username: string; phone: string | null; active: boolean };
type Device = { id: number; agent_id: number; model: string | null; os_version: string | null; app_version: string | null; permissions_ok: boolean | null; last_seen_at: Date | null; last_sync_at: Date | null; last_lat: number | null; last_lng: number | null; location_at: Date | null; created_at: Date };

export default async function AgentsPage({ searchParams }: PageProps<"/agents">) {
  const admin = await requireAdmin();
  const { error, notice } = await searchParams;
  const agents = await query<Agent>("SELECT id, name, username, phone, active FROM agents WHERE company_id = $1 ORDER BY name", [admin.companyId]);
  const devices = await query<Device>(
    "SELECT * FROM devices WHERE company_id = $1 AND NOT revoked ORDER BY created_at DESC",
    [admin.companyId],
  );

  return (
    <>
      <h1>Agents</h1>
      {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}
      {notice && <div className="notice">{notice}</div>}

      <div className="card">
        <h2>Add agent</h2>
        <p className="muted">The agent logs in to the app with client code <b>{admin.clientCode}</b>, this username and password.</p>
        <form action={createAgent} className="form-row">
          <input name="name" placeholder="Name" required />
          <input name="username" placeholder="Username" required />
          <input name="phone" placeholder="Phone (optional)" />
          <input name="password" type="password" placeholder="Password" minLength={6} required />
          <button type="submit">Add</button>
        </form>
      </div>

      <div className="card">
        <h2>All agents</h2>
        <table>
          <thead><tr><th>Name</th><th>Username</th><th>Phone</th><th>Status</th><th>Connected phones</th><th></th></tr></thead>
          <tbody>
            {agents.map((a) => {
              const own = devices.filter((d) => d.agent_id === a.id);
              return (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td>{a.username}</td>
                  <td>{a.phone ?? "-"}</td>
                  <td>{a.active ? "Active" : <span className="muted">Disabled</span>}</td>
                  <td>
                    {own.length === 0 && <span className="muted">Not logged in</span>}
                    {own.map((d) => (
                      <div key={d.id} style={{ marginBottom: 4 }}>
                        {d.model ?? "Phone"} (Android {d.os_version ?? "?"}, app {d.app_version ?? "?"})
                        {d.permissions_ok === false && <span className="badge missed" style={{ marginLeft: 6 }}>Permission off</span>}
                        <div className="muted">Last sync: {d.last_sync_at ? formatDateTime(d.last_sync_at) : "never"}</div>
                        {d.last_lat != null && d.last_lng != null && (
                          <div className="muted">
                            Last location:{" "}
                            <a
                              href={`https://maps.google.com/?q=${d.last_lat},${d.last_lng}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {d.last_lat.toFixed(5)}, {d.last_lng.toFixed(5)}
                            </a>
                            {d.location_at ? ` · ${formatDateTime(d.location_at)}` : ""}
                          </div>
                        )}
                        <form action={revokeDevice} className="inline">
                          <input type="hidden" name="id" value={d.id} />
                          <button className="secondary" type="submit">Disconnect</button>
                        </form>
                      </div>
                    ))}
                  </td>
                  <td>
                    <form action={setAgentActive} className="inline">
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="active" value={String(!a.active)} />
                      <button className={a.active ? "danger" : ""} type="submit">{a.active ? "Disable" : "Enable"}</button>
                    </form>{" "}
                    <form action={resetAgentPassword} className="inline">
                      <input type="hidden" name="id" value={a.id} />
                      <input name="password" type="password" placeholder="New password" minLength={6} required style={{ width: 130 }} />{" "}
                      <button className="secondary" type="submit">Reset</button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {agents.length === 0 && <tr><td colSpan={6} className="muted">No agents yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
