"use client";

import { useState } from "react";
import { Download, MessageCircle, Share2, Smartphone } from "lucide-react";
import { notify } from "@/lib/notify";

// Single source of truth for the APK — file lives in public/downloads.
const APK_PATH = "/downloads/call-crm.apk";

function apkUrl() {
  const env = process.env.NEXT_PUBLIC_APP_APK_URL?.trim();
  if (env) return env;
  if (typeof window === "undefined") return APK_PATH;
  return `${window.location.origin}${APK_PATH}`;
}

export function DownloadAppClient() {
  const [phone, setPhone] = useState("");

  const digits = phone.replace(/\D/g, "");
  const waNumber =
    digits.length === 10 ? `91${digits}` : digits.length === 12 && digits.startsWith("91") ? digits : "";
  const phoneInvalid = digits.length > 0 && !waNumber;

  function openWhatsApp() {
    if (phoneInvalid) {
      notify.error("Enter a valid 10-digit phone number");
      return;
    }
    const text = `Download the Call CRM app to track calls: ${apkUrl()}`;
    const url = waNumber
      ? `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-[var(--primary)]">
            <Smartphone size={20} />
          </span>
          <div>
            <h2 className="mb-0 text-base font-semibold leading-4 text-slate-900">Call CRM for Android</h2>
            <p className="mt-1 text-xs text-slate-500">APK installer</p>
          </div>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Install the app on this device to automatically sync call logs in the background.
        </p>
        <a
          href={APK_PATH}
          download="call-crm.apk"
          className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-4 text-sm font-medium text-white transition-colors hover:bg-[var(--primary-dark)]"
        >
          <Download size={15} /> Download APK
        </a>
        <p className="mt-3 text-center text-xs text-slate-400">
          If Android asks, allow &quot;install from unknown sources&quot; for your browser.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-green-50 text-green-600">
            <Share2 size={20} />
          </span>
          <div>
            <h2 className="mb-0 text-base font-semibold leading-4 text-slate-900">Share on WhatsApp</h2>
            <p className="mt-1 text-xs text-slate-500">Send the app link to your team</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-500">
          Enter a phone number to send the download link directly, or leave it empty to pick any chat.
        </p>
        <input
          type="tel"
          inputMode="numeric"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone number (optional)"
          className="mt-4 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-[var(--primary)]"
        />
        {phoneInvalid && <p className="mt-1.5 text-xs text-red-500">Enter a valid 10-digit number</p>}
        <button
          type="button"
          onClick={openWhatsApp}
          className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#25D366] px-4 text-sm font-medium text-white transition-colors hover:bg-[#1fb857]"
        >
          <MessageCircle size={15} /> Share download link
        </button>
      </div>
    </div>
  );
}
