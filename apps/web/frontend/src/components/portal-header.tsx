"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { User, KeyRound, LogOut, X } from "lucide-react";
import { profileFormSchema, changePasswordSchema, type ProfileFormValues, type ChangePasswordValues } from "@/lib/validation";
import { TextField, PasswordField, ReqMark } from "@/components/fields";
import { NotificationBell } from "@/components/notification-bell";
import { Spinner } from "@/components/spinner";
import { notify } from "@/lib/notify";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase();
}

async function readError(res: Response, fallback: string) {
  const data = await res.json().catch(() => ({}));
  return (data as { error?: string }).error ?? fallback;
}

function ProfileModal({ open, onClose, profileUrl, showPhone, defaults, loginId, onSaved }: { open: boolean; onClose: () => void; profileUrl: string; showPhone: boolean; defaults: { name: string; phone?: string }; loginId?: { label: string; value: string }; onSaved: () => void }) {
  const [pending, startTransition] = useTransition();
  const { control, handleSubmit, reset } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { name: "", phone: "" },
  });

  useEffect(() => {
    if (open) reset({ name: defaults.name, phone: defaults.phone ?? "" });
  }, [open, defaults.name, defaults.phone, reset]);

  useEffect(() => {
    if (!open || pending) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, pending, onClose]);

  if (!open) return null;

  function onValid(data: ProfileFormValues) {
    startTransition(async () => {
      const res = await fetch(profileUrl, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: data.name.trim(), phone: showPhone ? data.phone?.trim() || null : undefined }),
      });
      if (!res.ok) {
        notify.error(await readError(res, "Could not update profile"));
        return;
      }
      notify.success("Profile updated");
      onSaved();
      onClose();
    });
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => !pending && onClose()}>
      <div className="relative w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <span role="button" aria-label="Close" onClick={() => !pending && onClose()} className="absolute right-3 top-3 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          <X size={16} />
        </span>
        <h3 className="mb-4 pr-6 text-base font-semibold text-slate-900">Edit profile</h3>
        <form onSubmit={handleSubmit(onValid)} className="flex flex-col gap-3">
          <Controller name="name" control={control} render={({ field, fieldState }) => <TextField {...field} label={<>Name<ReqMark /></>} error={fieldState.error?.message} />} />
          {showPhone && (
            <Controller name="phone" control={control} render={({ field, fieldState }) => <TextField {...field} label="Phone" placeholder="Phone number" error={fieldState.error?.message} />} />
          )}
          {loginId && (
            <TextField name="loginId" label={loginId.label} value={loginId.value} disabled readOnly />
          )}
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={pending} className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={pending} className="inline-flex h-9 items-center gap-2 rounded-md bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-dark)] disabled:opacity-60">
              {pending ? <><Spinner />Saving…</> : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

function PasswordModal({ open, onClose, passwordUrl }: { open: boolean; onClose: () => void; passwordUrl: string }) {
  const [pending, startTransition] = useTransition();
  const { control, handleSubmit, reset } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (open) reset({ currentPassword: "", newPassword: "", confirmPassword: "" });
  }, [open, reset]);

  useEffect(() => {
    if (!open || pending) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, pending, onClose]);

  if (!open) return null;

  function onValid(data: ChangePasswordValues) {
    startTransition(async () => {
      const res = await fetch(passwordUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword: data.currentPassword, newPassword: data.newPassword }),
      });
      if (!res.ok) {
        notify.error(await readError(res, "Could not change password"));
        return;
      }
      notify.success("Password changed");
      onClose();
    });
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => !pending && onClose()}>
      <div className="relative w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <span role="button" aria-label="Close" onClick={() => !pending && onClose()} className="absolute right-3 top-3 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          <X size={16} />
        </span>
        <h3 className="mb-4 pr-6 text-base font-semibold text-slate-900">Change password</h3>
        <form onSubmit={handleSubmit(onValid)} className="flex flex-col gap-3">
          <Controller name="currentPassword" control={control} render={({ field, fieldState }) => <PasswordField {...field} label={<>Current password<ReqMark /></>} error={fieldState.error?.message} />} />
          <Controller name="newPassword" control={control} render={({ field, fieldState }) => <PasswordField {...field} label={<>New password<ReqMark /></>} error={fieldState.error?.message} />} />
          <Controller name="confirmPassword" control={control} render={({ field, fieldState }) => <PasswordField {...field} label={<>Confirm password<ReqMark /></>} error={fieldState.error?.message} />} />
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={pending} className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={pending} className="inline-flex h-9 items-center gap-2 rounded-md bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-dark)] disabled:opacity-60">
              {pending ? <><Spinner />Saving…</> : "Change password"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

export function PortalHeader({
  name,
  email,
  phone,
  companyName,
  listUrl,
  readUrl,
  profileUrl,
  passwordUrl,
  showPhone = false,
  loginId,
  logout,
}: {
  name: string;
  email?: string | null;
  phone?: string | null;
  companyName?: string;
  listUrl?: string;
  readUrl?: string;
  profileUrl: string;
  passwordUrl: string;
  showPhone?: boolean;
  loginId?: { label: string; value: string };
  logout: () => void | Promise<void>;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const subtitle = showPhone ? (phone ?? email ?? null) : (email ?? null);

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
      {companyName && (
        <p className="min-w-0 truncate text-sm font-semibold text-slate-700">{companyName}</p>
      )}
      <div className="flex items-center gap-2 sm:gap-3">
      <div className="hidden min-w-0 text-right sm:block">
        <p className="truncate text-sm font-semibold text-slate-800">{name}</p>
        {subtitle && <p className="truncate text-xs text-slate-500">{subtitle}</p>}
      </div>
      {listUrl && readUrl && <NotificationBell listUrl={listUrl} readUrl={readUrl} />}
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Account menu"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-300"
        >
          {initials(name)}
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl">
            <div className="border-b border-slate-100 px-3 py-2">
              <p className="truncate text-sm font-semibold text-slate-800">{name}</p>
              {subtitle && <p className="truncate text-xs text-slate-500">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setProfileOpen(true);
              }}
              className="flex w-full items-center gap-2 bg-white px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
            >
              <User size={15} className="text-slate-400" /> Profile edit
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setPasswordOpen(true);
              }}
              className="flex w-full items-center gap-2 bg-white px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
            >
              <KeyRound size={15} className="text-slate-400" /> Change password
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                void logout();
              }}
              className="flex w-full items-center gap-2 border-t border-slate-100 bg-white px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
            >
              <LogOut size={15} /> Logout
            </button>
          </div>
        )}
      </div>
      </div>

      <ProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        profileUrl={profileUrl}
        showPhone={showPhone}
        defaults={{ name, phone: phone ?? "" }}
        loginId={loginId}
        onSaved={() => router.refresh()}
      />
      <PasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} passwordUrl={passwordUrl} />
    </header>
  );
}
