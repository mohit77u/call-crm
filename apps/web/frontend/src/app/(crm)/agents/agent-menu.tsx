"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  deleteAgent,
  requestDeviceSync,
  resetAgentPassword,
  revokeDevice,
  setAgentActive,
} from "./actions";

export function AgentMenu({
  agentId,
  agentName,
  active,
  deviceId,
}: {
  agentId: number;
  agentName: string;
  active: boolean;
  deviceId: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const run = (fn: () => Promise<void>) => {
    setOpen(false);
    startTransition(fn);
  };

  return (
    <div className="menu-wrap" ref={ref}>
      <button
        type="button"
        className="menu-btn"
        disabled={pending}
        onClick={() => setOpen((v) => !v)}
        aria-label="Agent actions"
      >
        {pending ? "…" : "⋮"}
      </button>
      {open && (
        <div className="dropdown">
          <button type="button" onClick={() => run(() => setAgentActive(agentId, !active))}>
            {active ? "Disable agent" : "Enable agent"}
          </button>
          <button
            type="button"
            onClick={() => {
              const pw = prompt(`New password for ${agentName} (min 6 characters):`);
              if (pw) run(() => resetAgentPassword(agentId, pw));
              else setOpen(false);
            }}
          >
            Reset password
          </button>
          {deviceId != null && (
            <>
              <button type="button" onClick={() => run(() => requestDeviceSync(deviceId))}>
                Sync phone now
              </button>
              <button type="button" onClick={() => run(() => revokeDevice(deviceId))}>
                Disconnect phone
              </button>
            </>
          )}
          <button
            type="button"
            className="danger-item"
            onClick={() => {
              if (confirm(`Delete ${agentName}? Their phones will be disconnected and their call history removed.`)) {
                run(() => deleteAgent(agentId));
              } else setOpen(false);
            }}
          >
            Delete agent
          </button>
        </div>
      )}
    </div>
  );
}
