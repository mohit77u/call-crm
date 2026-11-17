"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Contact,
  FolderOpen,
  Gift,
  LayoutDashboard,
  Phone,
  Plus,
  Settings,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

const ICONS = {
  dashboard: LayoutDashboard,
  companies: Building2,
  agents: Users,
  calls: Phone,
  newCompany: UserPlus,
  leads: Contact,
  trials: Gift,
  files: FolderOpen,
  settings: Settings,
  plus: Plus,
} satisfies Record<string, LucideIcon>;

export type SidebarIcon = keyof typeof ICONS;

export type NavLink = { href: string; label: string; exact?: boolean; icon?: SidebarIcon };

export function SidebarLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  const matches = links.map((l) => ({
    link: l,
    match: l.exact ? pathname === l.href : pathname === l.href || pathname.startsWith(`${l.href}/`),
  }));
  const bestLength = Math.max(0, ...matches.filter((m) => m.match).map((m) => m.link.href.length));
  return (
    <>
      {matches.map(({ link, match }) => {
        const active = match && link.href.length === bestLength;
        const Icon = link.icon ? ICONS[link.icon] : null;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => document.body.classList.remove("nav-open")}
            className={`sidebar-link capitalize ${active ? "active" : ""}`}
          >
            {Icon && <Icon size={17} className="sidebar-link-icon" />}
            <span className="nav-label">{link.label}</span>
            <span className="nav-tip" role="tooltip">{link.label}</span>
          </Link>
        );
      })}
    </>
  );
}
