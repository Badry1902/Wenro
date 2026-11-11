"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ExperienceCard } from "@/lib/data/types";
import { formatMoney } from "@/lib/money";
import { mediaSrc } from "@/lib/media";
import { cardImages } from "@/lib/catalog";
import { IconCategory, IconClose, IconPin, IconStar } from "../Icons";
import { distanceTo } from "@/lib/places";
import { openCityPicker, useCity } from "./CityPicker";

/**
 * Explore map: every trip as a pin at its meeting point (or its area when the operator keeps the exact pin
 * for booked guests). Filter by category; tap a pin to see the trip. OpenStreetMap tiles, no tracking.
 */
export function ExploreMap({ cards, categories }: { cards: ExperienceCard[]; categories: { slug: string; name: string }[] }) {
  const t = useTranslations();
  const locale = useLocale();
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const [cat, setCat] = useState<string | null>(null);
  const [sel, setSel] = useState<ExperienceCard[] | null>(null);
  const placed = useMemo(() => cards.filter((c) => c.lat != null && c.lng != null && (!cat || c.category === cat)), [cards, cat]);
  const placedRef = useRef(placed);
  const [city] = useCity();

  useEffect(() => {
    if (!box.current || map.current) return;
    const m = L.map(box.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: true }).setView([26.8, 31.5], 6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "© OpenStreetMap" }).addTo(m);
    map.current = m; layer.current = L.layerGroup().addTo(m);
    m.on("zoomend", () => draw.current());
    return () => { m.remove(); map.current = null; };
  }, []);

  // Trips close together on screen become one pin ("5 trips · from €25"); tapping it zooms in and lists them.
  const draw = useRef(() => {});
  draw.current = () => {
    const m = map.current, g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    const groups: { pt: L.Point; ll: L.LatLng; items: ExperienceCard[] }[] = [];
    for (const c of placedRef.current) {
      const ll = L.latLng(Number(c.lat), Number(c.lng));
      const pt = m.latLngToLayerPoint(ll);
      const near = groups.find((x) => x.pt.distanceTo(pt) < 46);
      if (near) near.items.push(c); else groups.push({ pt, ll, items: [c] });
    }
    for (const grp of groups) {
      const priced = grp.items.filter((c) => c.from_minor != null).sort((a, b) => Number(a.from_minor) - Number(b.from_minor));
      const price = priced[0] ? formatMoney({ minor: priced[0].from_minor!, currency: priced[0].currency }, locale) : "";
      const one = grp.items.length === 1;
      const html = one
        ? `<span class="map-pin${grp.items[0].exact === false ? " map-pin-area" : ""}">${price || "•"}</span>`
        : `<span class="map-pin map-pin-group"><b>${grp.items.length}</b>${price ? ` · ${price}` : ""}</span>`;
      const icon = L.divIcon({ className: "", iconSize: [0, 0], html });
      const title = one ? grp.items[0].title ?? "" : t("explore.group", { n: grp.items.length });
      L.marker(grp.ll, { icon, title, keyboard: true, zIndexOffset: one ? 0 : 500 }).on("click", () => {
        setSel(grp.items);
        if (!one && m.getZoom() < 15) {
          const b = L.latLngBounds(grp.items.map((c) => [Number(c.lat), Number(c.lng)] as L.LatLngTuple));
          if (b.getNorthEast().distanceTo(b.getSouthWest()) > 30) m.flyToBounds(b, { padding: [80, 80], maxZoom: 16, duration: 0.6 });
        }
      }).addTo(g);
    }
  };

  useEffect(() => {
    placedRef.current = placed;
    const m = map.current;
    if (!m) return;
    setSel(null);
    // a chosen city: frame it and the trips within an easy ride; otherwise all of Egypt's trips
    const around = city ? placed.filter((c) => (distanceTo(city, c) ?? 9999) <= 90) : placed;
    const pts = around.map((c) => [Number(c.lat), Number(c.lng)] as L.LatLngTuple);
    if (city) pts.push([city.lat, city.lng]);
    if (pts.length > 1) m.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 13, animate: false });
    else if (pts.length === 1) m.setView(pts[0], 11, { animate: false });
    else m.setView([26.8, 31.5], 6, { animate: false });
    draw.current();
  }, [placed, locale, city]);

  const chip = (on: boolean) => `btn-press inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3 text-small font-semibold ${on ? "border-discovery bg-discovery text-white" : "border-line bg-surface hover:border-discovery"}`;
  const one = sel?.length === 1 ? sel[0] : null;
  const img = one ? cardImages(one)[0] : null;

  return (
    <div className="relative flex h-full flex-col">
      <div className="rail z-[500] flex gap-2 overflow-x-auto border-b border-line bg-surface px-4 py-2">
        <button type="button" className={chip(false)} onClick={openCityPicker}><IconPin size={16} className="text-apricot" />{city ? t(`places.city.${city.slug}` as "places.city.hurghada") : t("places.egypt")}</button>
        <button type="button" className={chip(!cat)} onClick={() => setCat(null)}>{t("explore.all")} · {cards.filter((c) => c.lat != null).length}</button>
        {categories.map((c) => (
          <button key={c.slug} type="button" className={chip(cat === c.slug)} onClick={() => setCat(c.slug)}><IconCategory name={c.slug} size={16} />{c.name}</button>
        ))}
      </div>
      <div ref={box} className="min-h-0 flex-1" role="application" aria-label={t("explore.title")} />
      {one && (
        <div className="pop-in absolute inset-x-3 bottom-3 z-[600] mx-auto flex max-w-lg gap-3 rounded-card border border-line bg-surface p-3 shadow-xl">
          {img && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaSrc(img, { w: 240, h: 240 })} alt="" className="size-24 shrink-0 rounded-[12px] object-cover" />
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Link href={`/experiences/${one.slug}`} className="line-clamp-2 font-bold leading-snug hover:text-discovery">{one.title}</Link>
            {one.reviews ? <span className="inline-flex items-center gap-1 text-small"><IconStar size={14} className="text-apricot" /><b>{Number(one.rating).toFixed(1)}</b> ({one.reviews})</span> : null}
            {one.from_minor != null && <span className="text-small text-ink-muted">{t("widget.from")} <b className="text-ink">{formatMoney({ minor: one.from_minor, currency: one.currency }, locale)}</b></span>}
            {one.exact === false && <span className="text-[12px] text-ink-muted">{t("map.areaNote")}</span>}
            <Link href={`/experiences/${one.slug}`} className="btn-press mt-auto inline-flex min-h-10 items-center justify-center rounded-control bg-discovery px-3 text-small font-bold text-white">{t("explore.see")}</Link>
          </div>
          <button type="button" onClick={() => setSel(null)} aria-label={t("gallery.close")} className="btn-press grid size-9 shrink-0 place-items-center rounded-full hover:bg-discovery-tint"><IconClose size={18} /></button>
        </div>
      )}
      {sel && sel.length > 1 && (
        <div className="pop-in absolute inset-x-3 bottom-3 z-[600] mx-auto flex max-h-[45dvh] max-w-lg flex-col rounded-card border border-line bg-surface shadow-xl">
          <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
            <b>{t("explore.group", { n: sel.length })}</b>
            <button type="button" onClick={() => setSel(null)} aria-label={t("gallery.close")} className="btn-press grid size-9 place-items-center rounded-full hover:bg-discovery-tint"><IconClose size={18} /></button>
          </div>
          <ul className="overflow-y-auto">
            {sel.map((c) => {
              const im = cardImages(c)[0];
              return (
                <li key={c.slug}>
                  <Link href={`/experiences/${c.slug}`} className="flex items-center gap-3 px-3 py-2 hover:bg-discovery-tint">
                    {im ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mediaSrc(im, { w: 120, h: 120 })} alt="" className="size-14 shrink-0 rounded-[10px] object-cover" />
                    ) : <span className="size-14 shrink-0 rounded-[10px] bg-discovery-tint" />}
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 font-semibold leading-snug">{c.title}</span>
                      {c.from_minor != null && <span className="text-small text-ink-muted">{t("widget.from")} <b className="text-ink">{formatMoney({ minor: c.from_minor, currency: c.currency }, locale)}</b></span>}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
