import { requireAdmin, getAdminToken } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { formatDateTime } from "@/lib/calls";
import { createAgent, requestAllDeviceSync } from "./actions";
import { AgentMenu } from "./agent-menu";

export const metadata = { title: "Agents" };

type Agent = { id: number; name: string; username: string; phone: string | null; active: boolean };
type Device = { id: number; agent_id: number; model: string | null; os_version: string | null; app_version: string | null; permissions_ok: boolean | null; last_seen_at: string | null; last_sync_at: string | null; last_lat: number | null; last_lng: number | null; location_at: string | null; created_at: string };

export default async function AgentsPage({ searchParams }: PageProps<"/agents">) {
  const admin = await requireAdmin();
  const { error, notice } = await searchParams;
  const { agents, devices } = await apiFetch<{ agents: Agent[]; devices: Device[] }>("/api/crm/agents", {
    token: await getAdminToken(),
  });

  const lastSyncFor = (agentId: number) => {
    const times = devices.filter((d) => d.agent_id === agentId && d.last_sync_at).map((d) => Date.parse(d.last_sync_at!));
    return times.length ? new Date(Math.max(...times)).toISOString() : null;
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Agents</h1>
          <p className="page-sub">{agents.length} agent{agents.length === 1 ? "" : "s"} · manage access, phones and passwords</p>
        </div>
      </div>
      {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}
      {notice && <div className="notice">{notice}</div>}

      <div className="card">
        <h2>Add agent</h2>
        <p className="muted">The agent logs in to the app with client code <b>{admin.clientCode}</b>, this username and password.</p>
        <form action={createAgent} className="form-row" noValidate>
          <input name="name" placeholder="Name" />
          <input name="username" placeholder="Username" />
          <input name="phone" placeholder="Phone" />
          <input name="password" type="password" placeholder="Password (min 6)" />
          <button type="submit">Add</button>
        </form>
      </div>

      <div className="card">
        <h2>All agents <form action={requestAllDeviceSync} className="inline" style={{ float: "right" }}><button className="secondary" type="submit">Sync all phones</button></form></h2>
        <table>
          <thead><tr><th>Name</th><th>Username</th><th>Phone</th><th>Status</th><th>Last sync</th><th>Connected phones</th><th></th></tr></thead>
          <tbody>
            {agents.map((a) => {
              const own = devices.filter((d) => d.agent_id === a.id);
              const lastSync = lastSyncFor(a.id);
              const primaryDevice = own[0] ?? null;
              return (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td>{a.username}</td>
                  <td>{a.phone ?? "-"}</td>
                  <td>{a.active ? "Active" : <span className="muted">Disabled</span>}</td>
                  <td className="muted">{lastSync ? formatDateTime(lastSync) : "Never"}</td>
                  <td>
                    {own.length === 0 && <span className="muted">Not logged in</span>}
                    {own.map((d) => (
                      <div key={d.id} style={{ marginBottom: 4 }}>
                        {d.model ?? "Phone"} (Android {d.os_version ?? "?"}, app {d.app_version ?? "?"})
                        {d.permissions_ok === false && <span className="badge missed" style={{ marginLeft: 6 }}>Permission off</span>}
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
                      </div>
                    ))}
                  </td>
                  <td>
                    <AgentMenu
                      agentId={a.id}
                      agentName={a.name}
                      active={a.active}
                      deviceId={primaryDevice?.id ?? null}
                    />
                  </td>
                </tr>
              );
            })}
            {agents.length === 0 && <tr><td colSpan={7} className="muted">No agents yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
