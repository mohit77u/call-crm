"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function SiteMobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const [prevPath, setPrevPath] = useState(pathname);

  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative max-[900px]:block hidden">
      <button
        type="button"
        aria-label="Menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
