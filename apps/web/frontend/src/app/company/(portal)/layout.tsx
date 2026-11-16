import Image from "next/image";
import { requireAdmin, hasFeature } from "@/lib/auth";
import { SidebarLinks } from "@/components/sidebar-links";
import { PortalHeader } from "@/components/portal-header";
import { logout } from "../actions";

export default async function CrmLayout({ children }: LayoutProps<"/">) {
  const admin = await requireAdmin();
  const links = [
    ...(hasFeature(admin, "reports") ? [{ href: "/company/dashboard", label: "Dashboard" }] : []),
    { href: "/company/calls", label: "Call logs" },
    ...(hasFeature(admin, "leadManagement")
      ? [
          { href: "/company/leads", label: "Leads" },
          { href: "/company/trials", label: "Free trial" },
        ]
      : []),
    { href: "/company/agents", label: "Agents" },
    { href: "/company/settings", label: "Settings" },
  ];
  return (
    <div className="shell">
      <nav className="sidebar">
        <div className="brand"><Image src="/logo.png" className="brand-logo" width={30} height={30} alt="" />Call CRM</div>
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
