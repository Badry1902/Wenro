"use client";

import { Link, usePathname } from "@/i18n/navigation";

// One line icon per menu item (18px, 1.5 stroke), picked from the last part of the address
const P: Record<string, string> = {
  home: "M3 10.5L12 4l9 6.5M5 9v10h5v-6h4v6h5V9",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  map: "M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14",
  wallet: "M3 7h15a3 3 0 013 3v7a3 3 0 01-3 3H3zM3 7V5a1 1 0 011-1h12v3M16 13.5h2",
  star: "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z",
  users: "M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2.5 20a6.5 6.5 0 0113 0M16 4.3a3.5 3.5 0 010 6.4M18.5 20a6.5 6.5 0 00-2.5-5.1",
  ticket: "M3 8a2 2 0 002-2h14a2 2 0 002 2v2a2 2 0 000 4v2a2 2 0 00-2 2H5a2 2 0 00-2-2v-2a2 2 0 000-4zM14 6v12",
  partners: "M4 20V8l8-4 8 4v12M9 20v-6h6v6M4 20h16",
  tag: "M3 12V4h8l10 10-8 8zM7.5 8.5h.01",
  mail: "M3 6h18v12H3zM3 7l9 6 9-6",
  plus: "M12 5v14M5 12h14",
  image: "M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 9h.01",
};
const ICON: Record<string, string> = {
  admin: "home", bookings: "ticket", finance: "wallet", money: "wallet", partners: "partners", experiences: "map",
  reviews: "star", coupons: "tag", messages: "mail", team: "users", departures: "calendar", book: "plus", kit: "image",
};

export function NavLink({ href, exact, children }: { href: string; exact?: boolean; children: React.ReactNode }) {
  const path = usePathname();
  const active = exact ? path === href : path === href || path.startsWith(`${href}/`);
  const last = href.split("/").filter(Boolean).pop() ?? "";
  const icon = P[ICON[last] ?? "home"];
  return (
    <Link href={href} aria-current={active ? "page" : undefined}
      className={`flex min-h-9 shrink-0 items-center gap-2.5 whitespace-nowrap rounded-[8px] px-2.5 text-[14px] font-medium transition-colors duration-150 ${
        active ? "bg-white/[0.09] text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]" : "text-white/70 hover:bg-white/[0.05] hover:text-white"}`}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        aria-hidden="true" className={`shrink-0 ${active ? "text-white" : "text-white/55"}`}><path d={icon} /></svg>
      {children}
    </Link>
  );
}
