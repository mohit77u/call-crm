"use client";

import { useState } from "react";
import Image from "next/image";
import { Download, MessageCircle, Share2 } from "lucide-react";
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
    <div className="mx-auto max-w-md">
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <Image src="/logo.png" alt="Call CRM" width={64} height={64} className="mx-auto rounded-2xl" />
        <h2 className="mt-3 text-lg font-semibold text-slate-900">Call CRM for Android</h2>
        <p className="mt-1 text-sm text-slate-500">
          Install the app to automatically sync call logs from this device.
        </p>
        <a
          href={APK_PATH}
          download="call-crm.apk"
          className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-4 text-sm font-medium text-white transition-colors hover:bg-[var(--primary-dark)]"
        >
          <Download size={16} /> Download APK
        </a>
        <p className="mt-3 text-xs text-slate-400">
          If Android asks, allow &quot;install from unknown sources&quot; for your browser.
        </p>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Share2 size={15} className="text-slate-400" /> Share on WhatsApp
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Enter a phone number to send the download link directly, or leave empty to pick a chat.
        </p>
        <input
          type="tel"
          inputMode="numeric"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone number (optional)"
          className="mt-3 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-[var(--primary)]"
        />
        {phoneInvalid && <p className="mt-1.5 text-xs text-red-500">Enter a valid 10-digit number</p>}
        <button
          type="button"
          onClick={openWhatsApp}
          className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          <MessageCircle size={15} className="text-green-600" /> Share download link
        </button>
      </div>
    </div>
  );
}
