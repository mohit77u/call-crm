import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Call CRM",
  description: "Track agent calls from the Android app",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
