import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { logout } from "../(auth)/actions";

export default async function CrmLayout({ children }: LayoutProps<"/">) {
  const admin = await requireAdmin();
  return (
    <div className="shell">
      <nav className="sidebar">
        <div className="brand">Call CRM</div>
        <div className="company">{admin.companyName}</div>
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/calls">Call logs</Link>
        <Link href="/agents">Agents</Link>
        <Link href="/settings">Settings</Link>
        <form action={logout}>
          <button className="secondary" type="submit">Logout</button>
        </form>
      </nav>
      <main className="main">{children}</main>
    </div>
  );
}
