import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3050"),
  title: {
    default: "Call CRM — Call tracking for sales teams",
    template: "%s | Call CRM",
  },
  description:
    "Call CRM automatically syncs call logs from your agents' Android phones into one dashboard — per-agent stats, call status, location tracking and CSV exports. Plans from ₹1,999/month.",
  openGraph: {
    title: "Call CRM — Call tracking for sales teams",
    description: "Every call your team makes, finally visible. Automatic Android call-log sync, agent stats and exports.",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
