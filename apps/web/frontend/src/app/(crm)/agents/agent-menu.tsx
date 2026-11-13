"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ellipsis, KeyRound, Power, RefreshCw, Trash2, Unlink } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { notify } from "@/lib/notify";
import {
  deleteAgent,
  requestDeviceSync,
  revokeDevice,
  setAgentActive,
  type AgentActionState,
} from "./actions";
import { ResetPasswordModal } from "./reset-password-modal";

type PendingAction = {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  run: () => Promise<AgentActionState>;
};

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
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<PendingAction | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const ask = (action: PendingAction) => {
    setOpen(false);
    setConfirm(action);
  };

  const execute = (action: PendingAction) => {
    startTransition(async () => {
      const res = await action.run();
      setConfirm(null);
      if (res.error) notify.error(res.error);
      else notify.success(res.notice ?? "Done");
      router.refresh();
    });
  };

  const itemCls =
    "flex w-full items-center gap-2 rounded-none border-0 bg-transparent px-3 py-2 text-left text-sm text-slate-600 shadow-none hover:bg-slate-50";

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        aria-label="Agent actions"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={pending}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-transparent p-0! text-slate-600 shadow-none hover:bg-slate-100 hover:text-slate-800"
      >
        {pending ? <span className="text-xs">…</span> : <Ellipsis size={20} strokeWidth={2.5} />}
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg">
          <button
            type="button"
            role="menuitem"
            className={itemCls}
            onClick={() =>
              ask({
                title: active ? "Disable agent?" : "Enable agent?",
                message: active
                  ? `Disable ${agentName}? They will be logged out and their phone will stop syncing.`
                  : `Enable ${agentName}? They will be able to log in to the app again.`,
                confirmLabel: active ? "Disable" : "Enable",
                danger: active,
                run: () => setAgentActive(agentId, !active),
              })
            }
          >
            <Power size={14} className="text-slate-400" /> {active ? "Disable agent" : "Enable agent"}
          </button>
          <button
            type="button"
            role="menuitem"
            className={itemCls}
            onClick={() => {
              setOpen(false);
              setResetOpen(true);
            }}
          >
            <KeyRound size={14} className="text-slate-400" /> Reset password
          </button>
          {deviceId != null && (
            <>
              <button
                type="button"
                role="menuitem"
                className={itemCls}
                onClick={() =>
                  ask({
                    title: "Sync phone now?",
                    message: `Request ${agentName}'s phone to send its latest call logs on the next check-in.`,
                    confirmLabel: "Request sync",
                    run: () => requestDeviceSync(deviceId),
                  })
                }
              >
                <RefreshCw size={14} className="text-slate-400" /> Sync phone now
              </button>
              <button
                type="button"
                role="menuitem"
                className={itemCls}
                onClick={() =>
                  ask({
                    title: "Disconnect phone?",
                    message: `Disconnect ${agentName}'s phone? The app on that device will be logged out.`,
                    confirmLabel: "Disconnect",
                    danger: true,
                    run: () => revokeDevice(deviceId),
                  })
                }
              >
                <Unlink size={14} className="text-slate-400" /> Disconnect phone
              </button>
            </>
          )}
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-none border-0 bg-red-50 px-3 py-2 text-left text-sm text-red-500 shadow-none"
            onClick={() =>
              ask({
                title: "Delete agent?",
                message: `Delete ${agentName}? Their phones will be disconnected and their call history removed.`,
                confirmLabel: "Delete",
                danger: true,
                run: () => deleteAgent(agentId),
              })
            }
          >
            <Trash2 size={14} className="text-red-400" /> Delete agent
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirm != null}
        onClose={() => setConfirm(null)}
        title={confirm?.title ?? ""}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel ?? "Confirm"}
        danger={confirm?.danger}
        pending={pending}
        onConfirm={() => confirm && execute(confirm)}
      />

      <ResetPasswordModal
        agentId={agentId}
        agentName={agentName}
        open={resetOpen}
        onClose={() => setResetOpen(false)}
      />
    </div>
  );
}
