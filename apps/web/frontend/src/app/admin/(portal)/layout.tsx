import Image from "next/image";
import { requireSuperadmin } from "@/lib/auth";
import { SidebarLinks, type NavLink } from "@/components/sidebar-links";
import { PortalHeader } from "@/components/portal-header";
import { platformLogout } from "../actions";

const ADMIN_LINKS: NavLink[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/admin/companies", label: "Companies", icon: "companies" },
  { href: "/admin/agents", label: "Agents", icon: "agents" },
  { href: "/admin/calls", label: "Call logs", icon: "calls" },
  { href: "/admin/companies/new", label: "+ New company", icon: "newCompany" },
];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const admin = await requireSuperadmin();
  return (
    <div className="shell">
      <nav className="sidebar">
        <div className="brand"><Image src="/logo.png" className="brand-logo" width={30} height={30} alt="" /><span>Call CRM</span></div>
        <div className="h-4" aria-hidden />
        <SidebarLinks links={ADMIN_LINKS} />
      </nav>
      <div className="flex min-w-0 flex-1 flex-col">
        <PortalHeader
          name={admin.name}
          email={admin.email}
          companyName="Platform admin"
          profileUrl="/api/admin/profile"
          passwordUrl="/api/admin/password"
          loginId={{ label: "Email", value: admin.email }}
          logout={platformLogout}
        />
        <main className="main admin-main">{children}</main>
      </div>
    </div>
  );
}
