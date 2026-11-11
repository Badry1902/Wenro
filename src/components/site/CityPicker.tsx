"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { CITIES, CITY_EVENT, CITY_KEY, GOVERNORATES, cityBySlug, nearestCity, type City } from "@/lib/places";
import { IconClose, IconPin, IconSearch } from "../Icons";

/** The traveller's chosen city, remembered in this browser (and in a cookie for the server). Null = all of Egypt. */
export function useCity(): [City | null, (slug: string | null) => void] {
  const [city, setCity] = useState<City | null>(null);
  useEffect(() => {
    const read = () => { try { setCity(cityBySlug(localStorage.getItem(CITY_KEY))); } catch { /* storage blocked */ } };
    read();
    window.addEventListener(CITY_EVENT, read);
    window.addEventListener("storage", read);
    return () => { window.removeEventListener(CITY_EVENT, read); window.removeEventListener("storage", read); };
  }, []);
  const choose = (slug: string | null) => {
    try {
      if (slug) localStorage.setItem(CITY_KEY, slug); else localStorage.removeItem(CITY_KEY);
      document.cookie = `wenro_city=${slug ?? ""}; path=/; max-age=${slug ? 31536000 : 0}; samesite=lax`;
    } catch { /* storage blocked: still works for this page */ }
    setCity(cityBySlug(slug));
    window.dispatchEvent(new Event(CITY_EVENT));
  };
  return [city, choose];
}

/** Opens the city chooser from anywhere (header chip, hero, planner). */
export const openCityPicker = () => window.dispatchEvent(new Event("wenro:city-open"));

/** Header chip showing the chosen city; opens the picker. */
export function CityChip({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("places");
  const [city] = useCity();
  return (
    <button type="button" onClick={openCityPicker} aria-label={`${t("choose")}: ${city ? t(`city.${city.slug}` as "city.hurghada") : t("all")}`}
      className="btn-press inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-small font-bold text-ink hover:bg-discovery-tint">
      <IconPin size={18} className="text-apricot" />
      {!compact && <span className="max-w-32 truncate">{city ? t(`city.${city.slug}` as "city.hurghada") : t("egypt")}</span>}
    </button>
  );
}

/** Modal: governorates with their cities, a filter box and "use my location". Mounted once in the header. */
export function CityPickerDialog({ counts }: { counts?: Record<string, number> }) {
  const t = useTranslations("places");
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<"idle" | "locating" | "failed">("idle");
  const [city, choose] = useCity();
  useEffect(() => {
    const o = () => { setOpen(true); setQ(""); setBusy("idle"); };
    window.addEventListener("wenro:city-open", o);
    return () => window.removeEventListener("wenro:city-open", o);
  }, []);
  useEffect(() => {
    if (!open) return;
    document.documentElement.style.overflow = "hidden";
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", k);
    return () => { document.documentElement.style.overflow = ""; document.removeEventListener("keydown", k); };
  }, [open]);
  const name = (c: City) => t(`city.${c.slug}` as "city.hurghada");
  const groups = useMemo(() => GOVERNORATES.map((g) => ({ g, cities: CITIES.filter((c) => c.gov === g && (!q || `${name(c)} ${c.slug} ${t(`gov.${g}` as "gov.redsea")}`.toLowerCase().includes(q.toLowerCase()))) })).filter((x) => x.cities.length),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q]);
  const pick = (slug: string | null) => { choose(slug); setOpen(false); };
  const locate = () => {
    if (!("geolocation" in navigator)) { setBusy("failed"); return; }
    setBusy("locating");
    navigator.geolocation.getCurrentPosition((p) => { const n = nearestCity(p.coords.latitude, p.coords.longitude); if (n) pick(n.city.slug); else setBusy("failed"); },
      () => setBusy("failed"), { timeout: 10000, maximumAge: 600000 });
  };
  if (!open) return null;
  // portal: the sticky header blurs its backdrop, which would trap a fixed overlay inside it
  return createPortal(
    <div className="fixed inset-0 z-[70] grid place-items-end sm:place-items-center" role="dialog" aria-modal="true" aria-label={t("pick")}>
      <button type="button" aria-label={t("change")} className="sheet-scrim absolute inset-0 bg-ink/45" onClick={() => setOpen(false)} />
      <div className="pop-in relative flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[28px] bg-surface shadow-2xl sm:rounded-[28px]">
        <div className="flex items-start justify-between gap-3 border-b border-line p-5">
          <div><h2 className="text-h2 font-extrabold">{t("pick")}</h2><p className="text-small text-ink-muted">{t("pickSub")}</p></div>
          <button type="button" onClick={() => setOpen(false)} aria-label={t("change")} className="btn-press grid size-10 shrink-0 place-items-center rounded-full hover:bg-discovery-tint"><IconClose size={20} /></button>
        </div>
        <div className="flex flex-wrap gap-2 border-b border-line p-4">
          <label className="flex min-h-11 flex-1 items-center gap-2 rounded-full border border-line px-4 focus-within:border-discovery">
            <IconSearch size={18} className="text-discovery" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} className="min-w-0 flex-1 bg-transparent outline-none" />
          </label>
          <button type="button" onClick={locate} className="btn-press inline-flex min-h-11 items-center gap-2 rounded-full bg-discovery px-4 text-small font-bold text-white">
            <IconPin size={16} />{busy === "locating" ? t("locating") : t("useLocation")}
          </button>
          {busy === "failed" && <p className="w-full text-small text-critical">{t("locFailed")}</p>}
        </div>
        <div className="overflow-y-auto p-4">
          <button type="button" onClick={() => pick(null)} aria-pressed={!city}
            className={`mb-4 inline-flex min-h-11 items-center rounded-full border px-4 font-bold ${!city ? "border-ink bg-ink text-white" : "border-line hover:border-ink"}`}>{t("all")}</button>
          {groups.map(({ g, cities }) => (
            <section key={g} className="mb-4">
              <h3 className="mb-2 text-small font-bold uppercase tracking-wider text-ink-muted">{t(`gov.${g}` as "gov.redsea")}</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {cities.map((c) => (
                  <button key={c.slug} type="button" onClick={() => pick(c.slug)} aria-pressed={city?.slug === c.slug}
                    className={`flex min-h-12 flex-col items-start justify-center rounded-control border px-3 py-2 text-start ${city?.slug === c.slug ? "border-discovery bg-discovery-tint" : "border-line hover:border-discovery"}`}>
                    <span className="font-bold leading-tight">{name(c)}</span>
                    {counts && <span className="text-[12px] text-ink-muted">{t("tripsHere", { n: counts[c.slug] ?? 0 })}</span>}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>,
    document.body,

  );
}
