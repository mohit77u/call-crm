"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Ellipsis, Pencil, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { notify } from "@/lib/notify";

type RowActionsMenuProps = {
  editHref: string;
  itemName: string;
  itemLabel?: string;
  deleteAction: () => Promise<{ error?: string } | void>;
  deleteMessage?: string;
  successMessage?: string;
};

export function RowActionsMenu({ editHref, itemName, itemLabel = "item", deleteAction, deleteMessage, successMessage = "Deleted" }: RowActionsMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const btn = ref.current?.querySelector("button");
    if (btn) {
      const r = btn.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: Math.max(8, r.right - 160) });
    }
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    const close = () => setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        aria-label="Row actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-transparent p-0! text-slate-600 shadow-none hover:bg-slate-100 hover:text-slate-800"
      >
        <Ellipsis size={20} strokeWidth={2.5} />
      </button>

      {open && pos &&
        createPortal(
          <div
            role="menu"
            style={{ position: "fixed", top: pos.top, left: pos.left }}
            className="z-50 w-40 overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg"
          >
            <Link
              href={editHref}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              <Pencil size={14} className="text-slate-400" /> Edit
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setConfirmOpen(true);
              }}
              className="flex w-full items-center gap-2 rounded-none border-0 bg-red-50 px-3 py-2 text-left text-sm text-red-500 shadow-none"
            >
              <Trash2 size={14} className="text-red-400" /> Delete
            </button>
          </div>,
          document.body,
        )}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={`Delete ${itemLabel}?`}
        message={deleteMessage ?? `${itemName} will be permanently removed. This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        pending={pending}
        onConfirm={() =>
          startTransition(async () => {
            const res = await deleteAction();
            setConfirmOpen(false);
            if (res?.error) {
              notify.error(res.error);
            } else {
              notify.success(successMessage);
              router.refresh();
            }
          })
        }
      />
    </div>
  );
}
