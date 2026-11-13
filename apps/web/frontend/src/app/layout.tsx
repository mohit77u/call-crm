import type { Metadata } from "next";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
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
      <body suppressHydrationWarning>
        <MantineProvider
          theme={{
            primaryColor: "blue",
            fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
          }}
        >
          <Notifications position="top-right" autoClose={4000} />
          {children}
        </MantineProvider>
      </body>
    </html>
  );
}
