"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export const LANG_NAME: Record<string, string> = { en: "English", de: "Deutsch", ru: "Русский", fr: "Français", ar: "العربية" };

/** Round flag for each language: UK (English), Germany, Russia, France, Egypt (Arabic, the platform's home). */
export function Flag({ locale, size = 22, className = "" }: { locale: string; size?: number; className?: string }) {
  const id = `flag-${locale}`;
  const body = (() => {
    switch (locale) {
      case "de": return <><rect width="24" height="8" fill="#000" /><rect y="8" width="24" height="8" fill="#DD0000" /><rect y="16" width="24" height="8" fill="#FFCE00" /></>;
      case "ru": return <><rect width="24" height="8" fill="#fff" /><rect y="8" width="24" height="8" fill="#0039A6" /><rect y="16" width="24" height="8" fill="#D52B1E" /></>;
      case "fr": return <><rect width="8" height="24" fill="#002395" /><rect x="8" width="8" height="24" fill="#fff" /><rect x="16" width="8" height="24" fill="#ED2939" /></>;
      case "ar": return <><rect width="24" height="8" fill="#CE1126" /><rect y="8" width="24" height="8" fill="#fff" /><rect y="16" width="24" height="8" fill="#000" />
        <circle cx="12" cy="12" r="2.3" fill="#C09300" /></>;
      default: return <><rect width="24" height="24" fill="#012169" />
        <path d="M0 0l24 24M24 0L0 24" stroke="#fff" strokeWidth="4.8" />
        <path d="M0 0l24 24M24 0L0 24" stroke="#C8102E" strokeWidth="1.6" />
        <path d="M12 0v24M0 12h24" stroke="#fff" strokeWidth="7" />
        <path d="M12 0v24M0 12h24" stroke="#C8102E" strokeWidth="4" /></>;
    }
  })();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={`shrink-0 rounded-full ring-1 ring-black/10 ${className}`}>
      <defs><clipPath id={id}><circle cx="12" cy="12" r="12" /></clipPath></defs>
      <g clipPath={`url(#${id})`}>{body}</g>
    </svg>
  );
}

/**
 * Language switch used on every page (site header, dashboards, standalone pages). Keeps the current page
 * and its filters; the menu lists each language with its flag and native name.
 */
export function LanguageMenu({ label, tone = "light", align = "end", compact = false, up = false }:
  { label: string; tone?: "light" | "dark"; align?: "start" | "end"; compact?: boolean; up?: boolean }) {
  const locale = useLocale();
  const pathname = usePathname();
  const search = useSearchParams();
  const query = Object.fromEntries(search.entries());
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDown); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);
  useEffect(() => { setOpen(false); }, [pathname, search]);

  const dark = tone === "dark";
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-expanded={open} aria-haspopup="menu" aria-label={`${label}: ${LANG_NAME[locale]}`} onClick={() => setOpen((v) => !v)}
        className={`btn-press inline-flex min-h-11 items-center gap-2 rounded-full px-2.5 text-small font-bold ${dark ? "text-white hover:bg-white/10" : "text-ink hover:bg-discovery-tint"} ${compact ? "" : "pe-3"}`}>
        <Flag locale={locale} size={24} />
        {!compact && <span>{LANG_NAME[locale]}</span>}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && (
        <div role="menu" className={`popover-panel absolute z-50 w-52 rounded-card border border-line bg-surface p-1.5 text-ink shadow-[0_20px_50px_-20px_rgb(25_36_78/0.4)] ${align === "end" ? "end-0" : "start-0"} ${up ? "bottom-full mb-2" : "top-full mt-2"}`}>
          {routing.locales.map((l) => (
            <Link key={l} role="menuitem" href={{ pathname, query }} locale={l} lang={l} aria-current={l === locale ? "true" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-control px-2.5 text-[15px] ${l === locale ? "bg-discovery-tint font-bold text-discovery" : "hover:bg-discovery-tint"}`}>
              <Flag locale={l} size={26} />
              <span className="flex-1">{LANG_NAME[l]}</span>
              {l === locale && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M5 12l5 5L19 7" /></svg>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/** Flag row for menus and footers. */
export function LanguageRow({ tone = "light" }: { tone?: "light" | "dark" }) {
  const locale = useLocale();
  const pathname = usePathname();
  const search = useSearchParams();
  const query = Object.fromEntries(search.entries());
  return (
    <div className="flex flex-wrap gap-2">
      {routing.locales.map((l) => (
        <Link key={l} href={{ pathname, query }} locale={l} lang={l} aria-current={l === locale ? "true" : undefined}
          className={`inline-flex min-h-11 items-center gap-2 rounded-full border ps-1.5 pe-3.5 text-small font-bold ${l === locale
            ? (tone === "dark" ? "border-white bg-white text-ink" : "border-discovery bg-discovery text-white")
            : (tone === "dark" ? "border-white/25 text-white/90 hover:border-white" : "border-line hover:border-discovery")}`}>
          <Flag locale={l} size={26} />{LANG_NAME[l]}
        </Link>
      ))}
    </div>
  );
}
