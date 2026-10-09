import Link from "next/link";
import { Suspense } from "react";
import { ActiveNavLinks, NavLinkList } from "./nav-links";

export function SiteNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-rule/80 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-[96rem] items-center justify-between gap-4 px-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-ink">
          <span aria-hidden className="flex gap-0.5">
            <span className="h-4 w-1.5 rounded-full bg-[var(--pg)]" />
            <span className="h-4 w-1.5 rounded-full bg-[var(--es)]" />
            <span className="h-4 w-1.5 rounded-full bg-[var(--os)]" />
          </span>
          FTS Lab
        </Link>
        {/* usePathname is runtime data: stream the active state, show plain links meanwhile */}
        <Suspense fallback={<NavLinkList pathname={null} />}>
          <ActiveNavLinks />
        </Suspense>
      </div>
    </header>
  );
}
