"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetAgentPassword } from "./actions";
import { resetAgentPasswordSchema, type ResetAgentPasswordValues } from "@/lib/validation";
import { PasswordField, ReqMark } from "@/components/fields";
import { Spinner } from "@/components/spinner";
import { notify } from "@/lib/notify";

export function ResetPasswordModal({
  agentId,
  agentName,
  open,
  onClose,
}: {
  agentId: number;
  agentName: string;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const {
    control,
    handleSubmit,
    clearErrors,
    reset,
  } = useForm<ResetAgentPasswordValues>({
    resolver: zodResolver(resetAgentPasswordSchema),
    defaultValues: { password: "" },
  });

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, pending, onClose]);

  if (!open) return null;

  function onValid(data: ResetAgentPasswordValues) {
    startTransition(async () => {
      const res = await resetAgentPassword(agentId, data.password);
      if (res.error) {
        notify.error(res.error);
        return;
      }
      notify.success(res.notice ?? "Password changed");
      reset();
      onClose();
      router.refresh();
    });
  }

  function handleClose() {
    if (pending) return;
    reset();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={handleClose}>
      <div
        className="w-full max-w-sm overflow-hidden rounded-xl bg-white text-left shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 text-left">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Reset Password</h3>
            <p className="mt-1 text-[13px] text-slate-500">Set a new app password for {agentName}.</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={pending}
            aria-label="Close"
            className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent p-0! text-slate-400 shadow-none transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onValid)} className="flex flex-col gap-4 p-5 text-left">
          <Controller
            name="password"
            control={control}
            render={({ field, fieldState }) => (
              <PasswordField
                {...field}
                label={<>New Password<ReqMark /></>}
                placeholder="Min. 6 characters"
                autoComplete="new-password"
                maxLength={100}
                size="sm"
                autoFocus
                error={fieldState.error?.message}
                onClearError={() => clearErrors("password")}
              />
            )}
          />

          <div className="mt-1 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={pending}
              className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700! shadow-sm hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-9 items-center justify-center rounded-md bg-[var(--primary)] px-4 text-sm font-medium text-white shadow-sm hover:bg-[var(--primary-dark)] disabled:opacity-60"
            >
              {pending ? <span className="inline-flex items-center justify-center gap-2"><Spinner />Saving…</span> : "Reset Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
