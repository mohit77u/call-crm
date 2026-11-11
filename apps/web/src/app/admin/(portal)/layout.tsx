import Link from "next/link";
import { requireSuperadmin } from "@/lib/auth";
import { platformLogout } from "../actions";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const admin = await requireSuperadmin();
  return (
    <div className="shell">
      <nav className="sidebar">
        <div className="brand">Call CRM</div>
        <div className="company">Admin · {admin.name}</div>
        <Link href="/admin">Companies</Link>
        <Link href="/admin/agents">Agents</Link>
        <Link href="/admin/calls">Call logs</Link>
        <form action={platformLogout}>
          <button className="secondary" type="submit">Logout</button>
        </form>
      </nav>
      <main className="main">{children}</main>
    </div>
  );
}
