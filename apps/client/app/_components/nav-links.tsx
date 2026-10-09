"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Search", isActive: (path: string) => path === "/" },
  { href: "/products", label: "Products", isActive: (path: string) => path.startsWith("/products") },
];

export function ActiveNavLinks() {
  return <NavLinkList pathname={usePathname()} />;
}

export function NavLinkList({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="Main" className="flex items-center gap-1">
      {LINKS.map((link) => {
        const active = pathname !== null && link.isActive(pathname);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ink ${
              active ? "bg-ink text-paper" : "text-muted hover:bg-ink/5 hover:text-ink"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
