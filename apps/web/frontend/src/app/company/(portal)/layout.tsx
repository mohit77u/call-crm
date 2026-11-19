import Image from "next/image";
import { requireAdmin, hasFeature } from "@/lib/auth";
import { SidebarLinks, type NavLink } from "@/components/sidebar-links";
import { PortalHeader } from "@/components/portal-header";
import { logout } from "../actions";

export default async function CrmLayout({ children }: LayoutProps<"/">) {
  const admin = await requireAdmin();
  const links: NavLink[] = [
    ...(hasFeature(admin, "reports") ? ([{ href: "/company/dashboard", label: "Dashboard", icon: "dashboard" }] as NavLink[]) : []),
    { href: "/company/calls", label: "Call logs", icon: "calls" },
    ...(hasFeature(admin, "leadManagement")
      ? ([
          { href: "/company/leads", label: "Leads", icon: "leads" },
          { href: "/company/clients", label: "Clients", icon: "clients" },
          { href: "/company/trials", label: "Free trial", icon: "trials" },
          { href: "/company/imported-files", label: "Imported files", icon: "files" },
        ] as NavLink[])
      : []),
    { href: "/company/agents", label: "Agents", icon: "agents" },
    { href: "/company/download-app", label: "Download app", icon: "download" },
    { href: "/company/settings", label: "Settings", icon: "settings" },
  ];
  return (
    <div className="shell">
      <nav className="sidebar">
        <div className="brand"><Image src="/logo.png" className="brand-logo" width={30} height={30} alt="" /><span>Call CRM</span></div>
        <div className="h-4" aria-hidden />
        <SidebarLinks links={links} />
      </nav>
      <div className="flex min-w-0 flex-1 flex-col">
        <PortalHeader
          name={admin.name}
          email={admin.email}
          companyName={admin.companyName}
          listUrl="/api/crm/notifications"
          readUrl="/api/crm/notifications/read"
          profileUrl="/api/crm/profile"
          passwordUrl="/api/crm/password"
          loginId={{ label: "Email", value: admin.email }}
          logout={logout}
        />
        <main className="main">{children}</main>
      </div>
    </div>
  );
}
