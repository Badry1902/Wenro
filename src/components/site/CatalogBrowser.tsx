"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { isCategory } from "@/lib/catalog";
import type { ExperienceCard } from "@/lib/data/types";
import { formatMoney } from "@/lib/money";
import { IconCategory, IconClose, IconSearch } from "../Icons";
import { TripCard } from "./TripCard";
import { THEMES, isTheme, patternStyle, themeFor, type Theme } from "@/lib/themes";
import { ThemeMotif } from "../brand/ThemeArt";

type Cat = { slug: string; name: string };
type Dur = "short" | "mid" | "long";
type Sort = "rec" | "low" | "high" | "short";

const durOf = (m: number | null): Dur => (m ?? 0) <= 180 ? "short" : (m ?? 0) <= 360 ? "mid" : "long";
// Search ignores case and Arabic/Latin accents
const norm = (s: string) => s.toLocaleLowerCase().normalize("NFKD").replace(/[̀-ًͯ-ْ]/g, "");

/** All trips with live filters. The category and search text are kept in the address so results can be shared. */
export function CatalogBrowser({ cards, categories }: { cards: ExperienceCard[]; categories: Cat[] }) {
  const sp = useSearchParams();
  const initial = { q: (sp.get("q") ?? "").slice(0, 80), cat: isCategory(sp.get("cat")) ? sp.get("cat") : null, theme: isTheme(sp.get("theme")) ? (sp.get("theme") as Theme) : null };
  const t = useTranslations();
  const locale = useLocale();
  const maxAll = Math.max(0, ...cards.map((c) => c.from_minor ?? 0));
  const ceil = Math.ceil(maxAll / 1000) * 1000;
  const [q, setQ] = useState(initial.q);
  const [cats, setCats] = useState<string[]>(initial.cat ? [initial.cat] : []);
  const [durs, setDurs] = useState<Dur[]>([]);
  const [max, setMax] = useState(ceil);
  const [instant, setInstant] = useState(false);
  const [pickup, setPickup] = useState(false);
  const [sort, setSort] = useState<Sort>("rec");
  const [sheet, setSheet] = useState(false);
  const [theme, setTheme] = useState<Theme | null>(initial.theme);
  const themeCount = useMemo(() => Object.fromEntries(THEMES.map((th) => [th, cards.filter((c) => themeFor(c) === th).length])) as Record<Theme, number>, [cards]);

  // keep ?q= and ?cat= in the address bar (single category only, like the links that lead here)
  useEffect(() => {
    const u = new URL(location.href);
    if (q) u.searchParams.set("q", q); else u.searchParams.delete("q");
    if (cats.length === 1) u.searchParams.set("cat", cats[0]); else u.searchParams.delete("cat");
    if (theme) u.searchParams.set("theme", theme); else u.searchParams.delete("theme");
    history.replaceState(history.state, "", u);
  }, [q, cats, theme]);
  useEffect(() => {
    document.documentElement.style.overflow = sheet ? "hidden" : "";
    return () => { document.documentElement.style.overflow = ""; };
  }, [sheet]);

  const results = useMemo(() => {
    const words = norm(q).split(/\s+/).filter(Boolean);
    const list = cards.filter((c) => {
      if (theme && themeFor(c) !== theme) return false;
      if (cats.length && !cats.includes(c.category ?? "")) return false;
      if (durs.length && !durs.includes(durOf(c.duration_minutes))) return false;
      if (max < ceil && (c.from_minor ?? 0) > max) return false;
      if (instant && c.booking_mode !== "instant") return false;
      if (pickup && !c.pickup) return false;
      if (words.length) {
        const hay = norm(`${c.title ?? ""} ${c.summary ?? ""} ${c.category ? t(`categories.${c.category}` as "categories.sea") : ""}`);
        if (!words.every((w) => hay.includes(w))) return false;
      }
      return true;
    });
    const p = (c: ExperienceCard) => c.from_minor ?? 0;
    if (sort === "low") list.sort((a, b) => p(a) - p(b));
    if (sort === "high") list.sort((a, b) => p(b) - p(a));
    if (sort === "short") list.sort((a, b) => (a.duration_minutes ?? 0) - (b.duration_minutes ?? 0));
    return list;
  }, [cards, q, cats, theme, durs, max, ceil, instant, pickup, sort, t]);

  const active = (q ? 1 : 0) + (theme ? 1 : 0) + cats.length + durs.length + (max < ceil ? 1 : 0) + (instant ? 1 : 0) + (pickup ? 1 : 0);
  const clear = () => { setQ(""); setTheme(null); setCats([]); setDurs([]); setMax(ceil); setInstant(false); setPickup(false); };
  const toggle = <T,>(list: T[], v: T) => list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
  const sig = JSON.stringify([q, theme, cats, durs, max, instant, pickup, sort]);

  const box = "size-5 shrink-0 accent-[var(--color-discovery)]";
  const Filters = (
    <div className="flex flex-col gap-7">
      <fieldset>
        <legend className="mb-3 font-bold">{t("list.category")}</legend>
        <div className="flex flex-col gap-1">
          {categories.map((c) => (
            <label key={c.slug} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-control px-2 hover:bg-discovery-tint">
              <input type="checkbox" className={box} checked={cats.includes(c.slug)} onChange={() => setCats((l) => toggle(l, c.slug))} />
              <IconCategory name={c.slug} size={18} className="text-ink-muted" />
              <span className="flex-1">{c.name}</span>
              <span className="text-small text-ink-muted">{cards.filter((x) => x.category === c.slug).length}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-3 font-bold">{t("list.duration")}</legend>
        <div className="flex flex-col gap-1">
          {(["short", "mid", "long"] as Dur[]).map((d) => (
            <label key={d} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-control px-2 hover:bg-discovery-tint">
              <input type="checkbox" className={box} checked={durs.includes(d)} onChange={() => setDurs((l) => toggle(l, d))} />
              {t(`list.d${d[0].toUpperCase()}${d.slice(1)}` as "list.dShort")}
            </label>
          ))}
        </div>
      </fieldset>
      {ceil > 0 && (
        <fieldset>
          <legend className="mb-2 flex w-full justify-between font-bold">
            {t("list.maxPrice")}
            <span className="font-semibold text-discovery">{max >= ceil ? t("list.any") : formatMoney({ minor: max, currency: cards[0]?.currency ?? "EUR" }, locale)}</span>
          </legend>
          <input type="range" className="brand-range w-full" min={1000} max={ceil} step={500} value={max} onChange={(e) => setMax(Number(e.target.value))} aria-label={t("list.maxPrice")} />
        </fieldset>
      )}
      <div className="flex flex-col gap-1">
        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-control px-2 hover:bg-discovery-tint">
          <input type="checkbox" className={box} checked={instant} onChange={(e) => setInstant(e.target.checked)} />{t("list.instantOnly")}
        </label>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-control px-2 hover:bg-discovery-tint">
          <input type="checkbox" className={box} checked={pickup} onChange={(e) => setPickup(e.target.checked)} />{t("list.pickupOnly")}
        </label>
      </div>
      {active > 0 && <button type="button" onClick={clear} className="btn-press min-h-11 rounded-full border border-line font-bold hover:border-discovery hover:text-discovery">{t("list.clear")}</button>}
    </div>
  );

  return (
    <div>
      {theme && <div className="mb-6 h-20 rounded-card md:h-28" style={patternStyle(theme, "feature", 280)} aria-hidden="true" />}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-4">
          {theme && (
            <span className="grid size-16 shrink-0 place-items-center rounded-2xl border border-line bg-surface" aria-hidden="true"><ThemeMotif theme={theme} size={40} /></span>
          )}
          <div>
            <h1 className="text-[30px] font-extrabold leading-tight md:text-[40px]">{theme ? t(`themes.${theme}.name`) : t("list.title")}</h1>
            <p className="mt-1 text-ink-muted">{theme ? t(`themes.${theme}.blurb`) : t("list.subtitle")}</p>
          </div>
        </div>
        <label className="flex min-h-12 w-full items-center gap-2 rounded-full border border-line bg-surface px-4 focus-within:border-discovery md:w-96">
          <IconSearch size={20} className="text-discovery" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("home.searchPlaceholder")} aria-label={t("list.search")}
            className="min-w-0 flex-1 bg-transparent outline-none" />
          {q && <button type="button" onClick={() => setQ("")} aria-label={t("list.clear")} className="grid size-8 place-items-center rounded-full hover:bg-discovery-tint"><IconClose size={16} /></button>}
        </label>
      </div>

      {/* collections: each with its own look */}
      {THEMES.filter((th) => themeCount[th] > 0).length > 1 && (
        <div role="group" aria-label={t("themes.label")} className="rail -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1">
          <button type="button" aria-pressed={!theme} onClick={() => setTheme(null)}
            className={`btn-press inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-small font-bold ${!theme ? "border-ink bg-ink text-white" : "border-line bg-surface hover:border-ink"}`}>{t("themes.all")}</button>
          {THEMES.filter((th) => themeCount[th] > 0).map((th) => (
            <button key={th} type="button" aria-pressed={theme === th} onClick={() => setTheme(theme === th ? null : th)}
              className={`btn-press inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border ps-1.5 pe-4 text-small font-bold ${theme === th ? "border-ink bg-ink text-white" : "border-line bg-surface hover:border-ink"}`}>
              <span className="grid size-8 place-items-center rounded-full bg-white"><ThemeMotif theme={th} size={22} /></span>
              {t(`themes.${th}.name`)}
            </button>
          ))}
        </div>
      )}

      {/* quick category chips */}
      <div className="rail -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1">
        <button type="button" onClick={() => setCats([])} aria-pressed={cats.length === 0}
          className={`chip-link btn-press inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 font-semibold ${cats.length === 0 ? "border-ink bg-ink text-white" : "border-line bg-surface"}`}>
          {t("home.allCategories")}
        </button>
        {categories.map((c) => {
          const on = cats.length === 1 && cats[0] === c.slug;
          return (
            <button key={c.slug} type="button" onClick={() => setCats(on ? [] : [c.slug])} aria-pressed={on}
              className={`chip-link btn-press inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 font-semibold ${on ? "border-ink bg-ink text-white" : "border-line bg-surface"}`}>
              <IconCategory name={c.slug} size={18} />{c.name}
            </button>
          );
        })}
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-[260px_1fr]">
        <aside className="hidden md:block">
          <div className="sticky top-24 rounded-card border border-line bg-surface p-5">
            <p className="mb-5 text-h3 font-bold">{t("list.filters")}</p>
            {Filters}
          </div>
        </aside>

        <section aria-live="polite">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="font-bold">{t("list.results", { n: results.length })}</p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setSheet(true)} className="btn-press inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 font-bold md:hidden">
                {t("list.filters")}{active > 0 && <span className="grid size-6 place-items-center rounded-full bg-discovery text-small text-white">{active}</span>}
              </button>
              <label className="flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-small">
                <span className="text-ink-muted">{t("list.sort")}</span>
                <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="bg-transparent font-bold outline-none">
                  <option value="rec">{t("list.sortRecommended")}</option>
                  <option value="low">{t("list.sortPriceLow")}</option>
                  <option value="high">{t("list.sortPriceHigh")}</option>
                  <option value="short">{t("list.sortShort")}</option>
                </select>
              </label>
            </div>
          </div>

          {results.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-card border border-dashed border-line px-6 py-16 text-center">
              <p className="text-ink-muted">{t("list.none")}</p>
              <button type="button" onClick={clear} className="btn-press min-h-11 rounded-full bg-discovery px-6 font-bold text-white">{t("list.clear")}</button>
            </div>
          ) : (
            <ul key={sig} className="stagger grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((c, k) => <li key={c.id}><TripCard c={c} priority={k < 3} /></li>)}
            </ul>
          )}
        </section>
      </div>

      {sheet && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label={t("list.filters")}>
          <button type="button" aria-label={t("gallery.close")} className="sheet-scrim absolute inset-0 bg-ink/40" onClick={() => setSheet(false)} />
          <div className="sheet-panel absolute inset-y-0 end-0 flex w-[min(92vw,400px)] flex-col bg-surface">
            <div className="flex items-center justify-between border-b border-line p-4">
              <span className="text-h3 font-bold">{t("list.filters")}</span>
              <button type="button" onClick={() => setSheet(false)} aria-label={t("gallery.close")} className="grid size-11 place-items-center rounded-full hover:bg-discovery-tint"><IconClose /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">{Filters}</div>
            <div className="border-t border-line p-4">
              <button type="button" onClick={() => setSheet(false)} className="btn-press min-h-12 w-full rounded-full bg-discovery font-bold text-white">
                {t("list.showResults")} ({results.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
