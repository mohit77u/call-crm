import Image from "next/image";
import { requireAgent } from "@/lib/auth";
import { SidebarLinks, type NavLink } from "@/components/sidebar-links";
import { PortalHeader } from "@/components/portal-header";
import { logout } from "../actions";

export default async function AgentLayout({ children }: LayoutProps<"/">) {
  const agent = await requireAgent();
  const links: NavLink[] = [
    { href: "/agent/dashboard", label: "Dashboard", icon: "dashboard" },
    { href: "/agent/leads", label: "My leads", icon: "leads" },
    { href: "/agent/trials", label: "Free trial", icon: "trials" },
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
          name={agent.name}
          email={agent.username}
          phone={agent.phone ?? null}
          companyName={agent.companyName}
          showPhone
          listUrl="/api/agent/notifications"
          readUrl="/api/agent/notifications/read"
          profileUrl="/api/agent/profile"
          passwordUrl="/api/agent/password"
          loginId={{ label: "Username", value: agent.username }}
          logout={logout}
        />
        <main className="main">{children}</main>
      </div>
    </div>
  );
}
