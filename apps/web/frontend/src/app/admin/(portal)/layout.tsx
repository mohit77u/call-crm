import Image from "next/image";
import { requireSuperadmin } from "@/lib/auth";
import { SidebarLinks } from "@/components/sidebar-links";
import { platformLogout } from "../actions";

const ADMIN_LINKS = [
  { href: "/admin", label: "Companies", exact: true },
  { href: "/admin/agents", label: "Agents" },
  { href: "/admin/calls", label: "Call logs" },
  { href: "/admin/companies/new", label: "+ New company" },
];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const admin = await requireSuperadmin();
  return (
    <div className="shell">
      <nav className="sidebar">
        <div className="brand"><Image src="/logo.png" className="brand-logo" width={30} height={30} alt="" />Call CRM</div>
        <div className="company">Platform admin</div>
        <div className="muted" style={{ fontSize: 12, padding: "0 10px 8px" }}>{admin.email}</div>
        <SidebarLinks links={ADMIN_LINKS} />
        <form action={platformLogout}>
          <button className="secondary" type="submit">Logout</button>
        </form>
      </nav>
      <main className="main">{children}</main>
    </div>
  );
}
