import Image from "next/image";
import { requireAgent } from "@/lib/auth";
import { SidebarLinks } from "@/components/sidebar-links";
import { logout } from "../actions";

export default async function AgentLayout({ children }: LayoutProps<"/">) {
  const agent = await requireAgent();
  const links = [
    { href: "/agent/leads", label: "My leads" },
    { href: "/agent/requests", label: "Requests" },
  ];
  return (
    <div className="shell">
      <nav className="sidebar">
        <div className="brand"><Image src="/logo.png" className="brand-logo" width={30} height={30} alt="" />Call CRM</div>
        <div className="company">{agent.companyName}</div>
        <div className="company" style={{ fontSize: 12, marginTop: -6 }}>{agent.name}</div>
        <SidebarLinks links={links} />
        <form action={logout}>
          <button className="secondary" type="submit">Logout</button>
        </form>
      </nav>
      <main className="main">{children}</main>
    </div>
  );
}
