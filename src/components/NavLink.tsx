"use client";

import { Link, usePathname } from "@/i18n/navigation";

export function NavLink({ href, exact, children }: { href: string; exact?: boolean; children: React.ReactNode }) {
  const path = usePathname();
  const active = exact ? path === href : path === href || path.startsWith(`${href}/`);
  return (
    <Link href={href} aria-current={active ? "page" : undefined}
      className={`nav-link btn-press flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-control px-3 text-[15px] font-semibold ${
        active ? "bg-discovery text-white" : "text-white/85 hover:bg-white/10"}`}>
      {children}
    </Link>
  );
}
