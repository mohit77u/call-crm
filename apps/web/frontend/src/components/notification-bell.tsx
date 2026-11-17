"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";

type NotificationItem = {
  id: number;
  type: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function NotificationBell({ listUrl, readUrl }: { listUrl: string; readUrl: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(listUrl, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.notifications ?? []);
      setUnread(data.unread ?? 0);
    } catch {
      // ignore polling errors
    }
  }, [listUrl]);

  useEffect(() => {
    const t = setTimeout(load, 0);
    const interval = setInterval(load, 30000);
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(t);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
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

  async function markRead(ids?: number[]) {
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await fetch(readUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(ids ? { ids } : {}),
      });
    } catch {
      // ignore
    }
  }

  function openNotification(n: NotificationItem) {
    if (!n.read) markRead([n.id]);
    setOpen(false);
    if (n.link) {
      // Let mounted list pages refetch fresh data without a full reload.
      window.dispatchEvent(new Event("crm:data-refresh"));
      router.push(n.link);
    }
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative inline-flex items-center justify-center rounded-md border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-800"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 flex max-h-80 w-80 max-w-[calc(100vw-16px)] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notifications</span>
            {unread > 0 && (
              <button type="button" onClick={() => markRead()} className="bg-transparent px-3 text-[12px]! font-medium text-slate-400 hover:text-slate-700">
                Mark all read
              </button>
            )}
          </div>
          <div className="overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-slate-400">No notifications yet.</p>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => openNotification(n)}
                className="flex w-full items-start gap-2 bg-white px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
              >
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-slate-700"}`} />
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm leading-snug ${n.read ? "text-slate-600" : "font-medium text-slate-800"}`}>{n.message}</span>
                  <span className="mt-0.5 block text-xs text-slate-400">{timeAgo(n.createdAt)}</span>
                </span>
              </button>
            ))
          )}
          </div>
        </div>
      )}
    </div>
  );
}
