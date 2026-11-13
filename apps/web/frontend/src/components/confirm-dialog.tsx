"use client";

import { useEffect } from "react";
import { Spinner } from "@/components/spinner";

type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  pending?: boolean;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  onClose,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  pending = false,
  onConfirm,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, pending, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={() => !pending && onClose()}
    >
      <div
        className="w-full max-w-sm whitespace-normal rounded-xl bg-white p-5 text-left shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
      >
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {message && <p className="mt-2 text-sm text-slate-500">{message}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700! shadow-sm hover:bg-slate-50 disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={`inline-flex h-9 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium text-white shadow-sm disabled:opacity-60 ${
              danger ? "bg-red-600 hover:bg-red-700" : "bg-[var(--primary)] hover:bg-[var(--primary-dark)]"
            }`}
          >
            {pending ? <span className="inline-flex items-center justify-center gap-2"><Spinner />Please wait…</span> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
