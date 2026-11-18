import { requireAdmin } from "@/lib/auth";
import { DownloadAppClient } from "./download-app-client";

export const metadata = { title: "Download app" };

export default async function DownloadAppPage() {
  await requireAdmin();
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Download app</h1>
          <p className="page-sub">Get the Call CRM Android app on your device</p>
        </div>
      </div>
      <DownloadAppClient />
    </>
  );
}
