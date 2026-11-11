"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import type { ExperienceCard } from "@/lib/data/types";
import { CATEGORIES } from "@/lib/catalog";
import { mediaSrc } from "@/lib/media";
import { formatMoney } from "@/lib/money";
import { CITIES } from "@/lib/places";
import { CATEGORY_IDEAS, indexCards, norm, search, tripDistance, understand } from "@/lib/search";
import { THEMES, themeFor } from "@/lib/themes";
import { IconCategory, IconClose, IconPin, IconSearch } from "../Icons";
import { ThemeMotif } from "../brand/ThemeArt";
import { useCity } from "./CityPicker";

export const openSearch = () => window.dispatchEvent(new Event("wenro:search-open"));

/**
 * Search from any page: trips (by meaning, in any language, typos forgiven), plus matching
 * categories, collections and cities. Enter opens the full results list.
 */
export function SearchOverlay() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [cards, setCards] = useState<ExperienceCard[] | null>(null);
  const [city, setCity] = useCity();
  const loaded = useRef<string | null>(null);

  useEffect(() => {
    const o = () => { setOpen(true); setQ(""); };
    const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); o(); } };
    window.addEventListener("wenro:search-open", o);
    document.addEventListener("keydown", k);
    return () => { window.removeEventListener("wenro:search-open", o); document.removeEventListener("keydown", k); };
  }, []);
  useEffect(() => {
    if (!open) return;
    if (loaded.current !== locale) {
      loaded.current = locale;
      fetch(`/api/search-index?locale=${locale}`).then((r) => r.json()).then((x) => setCards(Array.isArray(x) ? x : [])).catch(() => setCards([]));
    }
    document.documentElement.style.overflow = "hidden";
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", k);
    return () => { document.documentElement.style.overflow = ""; document.removeEventListener("keydown", k); };
  }, [open, locale]);

  const index = useMemo(() => indexCards(cards ?? [], (c) => `${c.category ? t(`categories.${c.category}` as "categories.sea") : ""} ${t(`themes.${themeFor(c)}.name`)}`), [cards, t]);
  const trips = useMemo(() => {
    if (!cards) return [];
    const found = q.trim() ? search(index, q) ?? [] : [...cards];
    // nothing typed + a chosen city: what's close first
    if (!q.trim() && city) found.sort((a, b) => (tripDistance(city, a).km ?? 9999) - (tripDistance(city, b).km ?? 9999));
    return found.slice(0, 8);
  }, [index, cards, q, city]);
  const n = norm(q);
  const u = understand(q);
  const asked = u.city;
  const ideas = u.ideas.flat();
  const cats = n ? CATEGORIES.filter((c) => norm(t(`categories.${c}` as "categories.sea")).includes(n) || ideas.some((k) => CATEGORY_IDEAS[c]?.includes(k))).slice(0, 4) : [];
  const themes = n ? THEMES.filter((th) => norm(t(`themes.${th}.name`)).includes(n)).slice(0, 3) : [];
  const cities = n ? CITIES.filter((c) => c.slug === asked?.slug || norm(t(`places.city.${c.slug}` as "places.city.hurghada")).includes(n)).slice(0, 4) : [];

  const go = () => { setOpen(false); router.push({ pathname: "/experiences", query: q.trim() ? { q: q.trim() } : {} }); };
  if (!open) return null;
  const row = "flex min-h-12 items-center gap-3 rounded-control px-3 py-2 hover:bg-discovery-tint focus-visible:bg-discovery-tint";

  // portal: the sticky header blurs its backdrop, which would trap a fixed overlay inside it
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-start justify-center sm:p-6 sm:pt-[10vh]" role="dialog" aria-modal="true" aria-label={t("list.search")}>
      <button type="button" aria-label={t("gallery.close")} className="sheet-scrim absolute inset-0 bg-ink/45" onClick={() => setOpen(false)} />
      <div className="pop-in relative flex h-full w-full max-w-2xl flex-col overflow-hidden bg-surface shadow-2xl sm:h-auto sm:max-h-[78vh] sm:rounded-[24px]">
        <form onSubmit={(e) => { e.preventDefault(); go(); }} className="flex items-center gap-2 border-b border-line p-3">
          <IconSearch size={22} className="ms-2 shrink-0 text-discovery" />
          <input autoFocus type="text" enterKeyHint="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("home.searchPlaceholder")} aria-label={t("list.search")}
            className="min-h-12 min-w-0 flex-1 bg-transparent text-[18px] outline-none" />
          <button type="button" onClick={() => setOpen(false)} aria-label={t("gallery.close")} className="btn-press grid size-11 shrink-0 place-items-center rounded-full hover:bg-discovery-tint"><IconClose size={20} /></button>
        </form>
        <div className="overflow-y-auto p-2" aria-live="polite">
          {(cats.length > 0 || themes.length > 0 || cities.length > 0) && (
            <div className="flex flex-wrap gap-2 p-2">
              {cities.map((c) => (
                <button key={c.slug} type="button" onClick={() => { setCity(c.slug); go(); }}
                  className="btn-press inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line px-3 text-small font-bold hover:border-discovery">
                  <IconPin size={15} className="text-apricot" />{t(`places.city.${c.slug}` as "places.city.hurghada")}
                </button>
              ))}
              {themes.map((th) => (
                <Link key={th} href={{ pathname: "/experiences", query: { theme: th } }} onClick={() => setOpen(false)}
                  className="btn-press inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line ps-1 pe-3 text-small font-bold hover:border-discovery">
                  <span className="grid size-8 place-items-center rounded-full bg-ivory"><ThemeMotif theme={th} size={20} /></span>{t(`themes.${th}.name`)}
                </Link>
              ))}
              {cats.map((c) => (
                <Link key={c} href={{ pathname: "/experiences", query: { cat: c } }} onClick={() => setOpen(false)}
                  className="btn-press inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line px-3 text-small font-bold hover:border-discovery">
                  <IconCategory name={c} size={16} />{t(`categories.${c}` as "categories.sea")}
                </Link>
              ))}
            </div>
          )}
          {!q.trim() && <p className="px-3 pb-1 pt-2 text-small font-bold uppercase tracking-wider text-ink-muted">{city ? t("places.nearYou", { city: t(`places.city.${city.slug}` as "places.city.hurghada") }) : t("search.popular")}</p>}
          {cards === null ? <p className="p-4 text-ink-muted">{t("search.loading")}</p>
            : trips.length === 0 ? <p className="p-4 text-ink-muted">{t("search.none")}</p>
            : (
              <ul>
                {trips.map((c) => {
                  const img = c.images?.[0] ?? (c.cover?.kind !== "video" ? c.cover?.path : undefined);
                  const d = city ? tripDistance(city, c).km : null;
                  return (
                    <li key={c.id}>
                      <Link href={`/experiences/${c.slug}`} onClick={() => setOpen(false)} className={row}>
                        <span className="size-14 shrink-0 overflow-hidden rounded-xl bg-aqua">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {img && <img src={mediaSrc(img, { w: 112, h: 112 })} alt="" className="size-full object-cover" loading="lazy" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-bold">{c.title}</span>
                          <span className="block truncate text-small text-ink-muted">
                            {c.category ? t(`categories.${c.category}` as "categories.sea") : ""}{d != null ? ` · ${Math.round(d)} km` : ""}
                          </span>
                        </span>
                        {c.from_minor != null && <span className="shrink-0 text-small font-bold tabular-nums">{formatMoney({ minor: c.from_minor, currency: c.currency }, locale)}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          {q.trim() && (
            <button type="button" onClick={go} className="btn-press m-2 inline-flex min-h-12 items-center justify-center rounded-control bg-discovery px-5 font-bold text-white">
              {t("search.all", { q: q.trim() })}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,

  );
}
