"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLink = { href: string; label: string; exact?: boolean };

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
        return (
          <Link key={link.href} href={link.href} className={active ? "active" : undefined}>
            {link.label}
          </Link>
        );
      })}
    </>
  );
}
