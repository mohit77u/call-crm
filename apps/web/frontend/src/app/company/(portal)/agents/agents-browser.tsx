"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { SearchInput } from "@/components/search-input";
import { DataTable } from "@/components/data-table";
import { formatDateTime } from "@/lib/calls";
import { notify } from "@/lib/notify";
import { requestAllDeviceSync } from "./actions";
import { AgentMenu } from "./agent-menu";
import { AddAgentModal } from "./add-agent-modal";

export type AgentRow = { id: number; name: string; username: string; phone: string | null; active: boolean };
export type DeviceRow = {
  id: number;
  agent_id: number;
  model: string | null;
  os_version: string | null;
  app_version: string | null;
  permissions_ok: boolean | null;
  last_sync_at: string | null;
  last_lat: number | null;
  last_lng: number | null;
  location_at: string | null;
};

const toolbarBtn =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50";
const primaryBtn =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-[var(--primary)] px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[var(--primary-dark)]";

function lastSyncFor(devices: DeviceRow[], agentId: number) {
  const times = devices.filter((d) => d.agent_id === agentId && d.last_sync_at).map((d) => Date.parse(d.last_sync_at!));
  return times.length ? new Date(Math.max(...times)).toISOString() : null;
}

function PhonesCell({ devices }: { devices: DeviceRow[] }) {
  if (devices.length === 0) return <span className="muted">Not logged in</span>;
  return (
    <>
      {devices.map((d) => (
        <div key={d.id} className="mb-1">
          {d.model ?? "Phone"} (Android {d.os_version ?? "?"}, app {d.app_version ?? "?"})
          {d.permissions_ok === false && <span className="badge missed ml-1.5">Permission off</span>}
          {d.last_lat != null && d.last_lng != null && (
            <div className="muted">
              Last location:{" "}
              <a href={`https://maps.google.com/?q=${d.last_lat},${d.last_lng}`} target="_blank" rel="noreferrer">
                {d.last_lat.toFixed(5)}, {d.last_lng.toFixed(5)}
              </a>
              {d.location_at ? ` · ${formatDateTime(d.location_at)}` : ""}
            </div>
          )}
        </div>
      ))}
    </>
  );
}

export function AgentsBrowser({ agents, devices, clientCode }: { agents: AgentRow[]; devices: DeviceRow[]; clientCode: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [syncPending, startSync] = useTransition();

  const syncAll = () => {
    startSync(async () => {
      const res = await requestAllDeviceSync();
      if (res.error) notify.error(res.error);
      else notify.success(res.notice ?? "Sync requested");
      router.refresh();
    });
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return agents;
    return agents.filter((a) => [a.name, a.username, a.phone ?? ""].some((v) => v.toLowerCase().includes(needle)));
  }, [agents, q]);

  return (
    <>
      <div className="mb-2 flex items-center justify-between gap-2">
        <SearchInput value={q} onSearch={setQ} placeholder="Search name, username, phone…" className="w-full max-w-xs" />
        <div className="flex items-center gap-2">
          <button type="button" className={toolbarBtn} disabled={syncPending} onClick={syncAll}>
            {syncPending ? "Syncing…" : "Sync All Phones"}
          </button>
          <button type="button" className={primaryBtn} onClick={() => setModalOpen(true)}>
            <Plus size={15} /> New Agent
          </button>
        </div>
      </div>

      <DataTable
        rowKey={(a) => a.id}
        rows={filtered}
        emptyMessage={q ? "No agents match your search." : "No agents yet."}
        columns={[
          { header: "Name", cell: (a) => a.name },
          { header: "Username", cell: (a) => a.username },
          { header: "Phone", cell: (a) => a.phone ?? "-" },
          { header: "Status", cell: (a) => (a.active ? "Active" : <span className="muted">Disabled</span>) },
          { header: "Last Sync", cell: (a) => { const t = lastSyncFor(devices, a.id); return <span className="muted">{t ? formatDateTime(t) : "Never"}</span>; } },
          { header: "Phones", cell: (a) => <PhonesCell devices={devices.filter((d) => d.agent_id === a.id)} /> },
          {
            header: "Actions",
            className: "text-right!",
            cell: (a) => {
              const own = devices.filter((d) => d.agent_id === a.id);
              return (
                <AgentMenu
                  agentId={a.id}
                  agentName={a.name}
                  active={a.active}
                  deviceId={own[0]?.id ?? null}
                />
              );
            },
          },
        ]}
      />

      <AddAgentModal open={modalOpen} onClose={() => setModalOpen(false)} clientCode={clientCode} />
    </>
  );
}
