"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/navigation";
import { IconCategory, IconClose } from "../Icons";
import { AccountButton } from "./AccountButton";
import { LanguageMenu, LanguageRow } from "../LanguageMenu";

type Cat = { slug: string; name: string; blurb: string };
type Labels = { allTrips: string; categories: string; menu: string; language: string; close: string; partners: string; explore: string; plan: string };


/** Closes a popover on outside click and Escape. */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open, close]);
  return ref;
}

export function HeaderMenus({ categories, labels, account }: { categories: Cat[]; labels: Labels; account: { signIn: string; dashboard: string } }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const [cats, setCats] = useState(false);
  const [sheet, setSheet] = useState(false);
  const catRef = useDismiss(cats, () => setCats(false));

  // Close menus after navigating
  useEffect(() => { setCats(false); setSheet(false); }, [pathname, search]);
  // Lock page scroll behind the phone menu
  useEffect(() => {
    document.documentElement.style.overflow = sheet ? "hidden" : "";
    return () => { document.documentElement.style.overflow = ""; };
  }, [sheet]);

  return (
    <>
      <nav className="ms-4 hidden flex-1 items-center gap-1 md:flex" aria-label={labels.menu}>
        <Link href="/experiences" className="nav-link inline-flex min-h-11 items-center rounded-full px-3 text-[15px] font-semibold text-ink hover:bg-discovery-tint hover:text-discovery">
          {labels.allTrips}
        </Link>
        <Link href="/explore" className="nav-link inline-flex min-h-11 items-center rounded-full px-3 text-[15px] font-semibold text-ink hover:bg-discovery-tint hover:text-discovery">{labels.explore}</Link>
        <Link href="/plan" className="nav-link hidden min-h-11 items-center rounded-full px-3 text-[15px] font-semibold text-ink hover:bg-discovery-tint hover:text-discovery lg:inline-flex">{labels.plan}</Link>
        <div ref={catRef} className="relative">
          <button type="button" aria-expanded={cats} onClick={() => setCats((v) => !v)}
            className="nav-link inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-[15px] font-semibold text-ink hover:bg-discovery-tint hover:text-discovery">
            {labels.categories}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"
              className={`transition-transform duration-200 ${cats ? "rotate-180" : ""}`}><path d="M6 9l6 6 6-6" /></svg>
          </button>
          {cats && (
            <div className="popover-panel absolute start-0 top-full mt-2 grid w-[620px] grid-cols-2 gap-1 rounded-card border border-line bg-surface p-2 shadow-[0_20px_50px_-20px_rgb(35_43_69/0.35)]">
              {categories.map((c) => (
                <Link key={c.slug} href={{ pathname: "/experiences", query: { cat: c.slug } }}
                  className="group flex items-center gap-3 rounded-control p-2.5 hover:bg-discovery-tint">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-apricot-tint text-ink transition-colors group-hover:bg-discovery group-hover:text-white">
                    <IconCategory name={c.slug} size={20} />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-bold leading-tight">{c.name}</span>
                    <span className="block truncate text-small text-ink-muted">{c.blurb}</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </nav>
      <div className="flex-1 md:hidden" />

      <div className="hidden sm:block"><LanguageMenu label={labels.language} /></div>
      <div className="sm:hidden"><LanguageMenu label={labels.language} compact /></div>

      <button type="button" onClick={() => setSheet(true)} aria-label={labels.menu} aria-expanded={sheet}
        className="btn-press inline-flex size-11 items-center justify-center rounded-full border border-line md:hidden">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
      </button>

      {sheet && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label={labels.menu}>
          <button type="button" aria-label={labels.close} className="sheet-scrim absolute inset-0 bg-ink/40" onClick={() => setSheet(false)} />
          <div className="sheet-panel absolute inset-y-0 end-0 flex w-[min(88vw,380px)] flex-col overflow-y-auto bg-surface">
            <div className="flex items-center justify-between border-b border-line p-4">
              <span className="font-bold">{labels.menu}</span>
              <button type="button" onClick={() => setSheet(false)} aria-label={labels.close} className="btn-press grid size-11 place-items-center rounded-full hover:bg-discovery-tint"><IconClose /></button>
            </div>
            <div className="flex flex-col gap-1 p-3">
              <AccountButton labels={account} className="mb-2 flex min-h-12 justify-center text-[16px]" />
              <Link href="/experiences" className="flex min-h-12 items-center rounded-control px-3 font-bold hover:bg-discovery-tint">{labels.allTrips}</Link>
              <Link href="/explore" className="flex min-h-12 items-center rounded-control px-3 font-bold hover:bg-discovery-tint">{labels.explore}</Link>
              <Link href="/plan" className="flex min-h-12 items-center rounded-control px-3 font-bold hover:bg-discovery-tint">{labels.plan}</Link>
              <p className="mt-3 px-3 text-small font-bold uppercase tracking-wider text-ink-muted">{labels.categories}</p>
              {categories.map((c) => (
                <Link key={c.slug} href={{ pathname: "/experiences", query: { cat: c.slug } }} className="flex min-h-12 items-center gap-3 rounded-control px-3 hover:bg-discovery-tint">
                  <span className="grid size-9 place-items-center rounded-full bg-apricot-tint"><IconCategory name={c.slug} size={18} /></span>{c.name}
                </Link>
              ))}
              <p className="mt-3 px-3 text-small font-bold uppercase tracking-wider text-ink-muted">{labels.language}</p>
              <div className="px-3"><LanguageRow /></div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
