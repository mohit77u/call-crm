import Image from "next/image";
import { requireAdmin, hasFeature } from "@/lib/auth";
import { SidebarLinks } from "@/components/sidebar-links";
import { logout } from "../actions";

export default async function CrmLayout({ children }: LayoutProps<"/">) {
  const admin = await requireAdmin();
  const links = [
    ...(hasFeature(admin, "reports") ? [{ href: "/company/dashboard", label: "Dashboard" }] : []),
    { href: "/company/calls", label: "Call logs" },
    { href: "/company/agents", label: "Agents" },
    { href: "/company/settings", label: "Settings" },
  ];
  return (
    <div className="shell">
      <nav className="sidebar">
        <div className="brand"><Image src="/logo.png" className="brand-logo" width={30} height={30} alt="" />Call CRM</div>
        <div className="company">{admin.companyName}</div>
        <SidebarLinks links={links} />
        <form action={logout}>
          <button className="secondary" type="submit">Logout</button>
        </form>
      </nav>
      <main className="main">{children}</main>
    </div>
  );
}
