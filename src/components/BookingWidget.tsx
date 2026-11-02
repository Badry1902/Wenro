"use client";

import { useMemo, useState, useTransition } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { ExperiencePage, SlotRow } from "@/lib/data/types";
import { dayKey, preview, priceOf, transportFor, type Selection } from "@/lib/pricing";
import { approxDisplay, formatMoney } from "@/lib/money";
import { IconCalendar, IconCash, IconCheck } from "./Icons";

const defaultDisplay: Record<string, string> = { de: "EUR", fr: "EUR", en: "USD", ru: "RUB", ar: "USD" };

export function BookingWidget({ page, agency }: { page: ExperiencePage; agency?: string }) {
  const t = useTranslations();
  const locale = useLocale();
  const format = useFormatter();
  const router = useRouter();
  const [navigating, startNav] = useTransition();

  const days = useMemo(() => {
    const map = new Map<string, SlotRow[]>();
    for (const s of page.slots) {
      const k = dayKey(s.starts_at);
      map.set(k, [...(map.get(k) ?? []), s]);
    }
    return [...map.entries()];
  }, [page.slots]);

  const [day, setDay] = useState(days[0]?.[0] ?? null);
  const daySlots = days.find(([k]) => k === day)?.[1] ?? [];
  const [slotId, setSlotId] = useState<string | null>(daySlots.find((s) => s.seats_left > 0)?.id ?? null);
  const [sel, setSel] = useState<Selection>({ adults: 2, children: 0, infants: 0, hotelId: null, transport: false, extras: [] });

  const currencies = [page.currency, ...Object.keys(page.fx)];
  const [display, setDisplay] = useState(
    currencies.includes(defaultDisplay[locale]) ? defaultDisplay[locale] : page.currency,
  );
  const rate = display === page.currency ? null : page.fx[display] ?? null;

  const slot = page.slots.find((s) => s.id === slotId) ?? null;
  const p = preview(page, sel);
  const notEnough = slot ? p.seats > slot.seats_left : false;
  const canContinue = !!slot && p.seats > 0 && !notEnough && !p.transportUnavailable && (!sel.transport || !!sel.hotelId);
  const money = (minor: number) => formatMoney({ minor, currency: page.currency }, locale);
  const adult = priceOf(page, "adult");

  const pickDay = (k: string) => {
    setDay(k);
    const first = days.find(([d]) => d === k)?.[1].find((s) => s.seats_left > 0);
    setSlotId(first?.id ?? null);
  };

  const go = () => {
    if (!slot) return;
    const q: Record<string, string> = {
      s: slot.id, a: String(sel.adults), c: String(sel.children), i: String(sel.infants), cur: display,
    };
    if (sel.transport && sel.hotelId) { q.t = "1"; q.h = sel.hotelId; } else if (sel.hotelId) q.h = sel.hotelId;
    if (sel.extras.length) q.x = sel.extras.join(",");
    if (agency) q.ag = agency;
    startNav(() => router.push({ pathname: `/book/${page.slug}`, query: q }));
  };

  const stepper = (key: "adults" | "children" | "infants", label: string, sub: string) => {
    const v = sel[key];
    const min = key === "adults" ? 1 : 0;
    const max = key === "infants" ? sel.adults : 20;
    return (
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold">{label}</div>
          <div className="text-small text-ink-muted">{sub}</div>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" aria-label={t("widget.fewer", { label })} disabled={v <= min}
            onClick={() => setSel({ ...sel, [key]: v - 1 })}
            className="btn-press h-11 w-11 rounded-control border border-[#8A90A6] bg-surface text-lg disabled:opacity-40">−</button>
          <span aria-live="polite" className="min-w-5 text-center font-bold"><span key={v} className="value-tick">{v}</span></span>
          <button type="button" aria-label={t("widget.more", { label })} disabled={v >= max}
            onClick={() => setSel({ ...sel, [key]: v + 1 })}
            className="btn-press h-11 w-11 rounded-control border border-[#8A90A6] bg-surface text-lg disabled:opacity-40">+</button>
        </div>
      </div>
    );
  };

  const ageLabel = (kind: "adult" | "child" | "infant") => {
    const pr = priceOf(page, kind);
    if (!pr) return "";
    const age = pr.age_max == null ? t("widget.ageFrom", { min: pr.age_min ?? 0 }) : t("widget.ageRange", { min: pr.age_min ?? 0, max: pr.age_max });
    return `${age} · ${pr.price_minor === 0 ? t("common.free") : money(pr.price_minor)}`;
  };

  const hotel = page.hotels.find((h) => h.id === sel.hotelId);
  const tr = transportFor(page, hotel);
  const lineLabel = (kind: string, label?: string | null) =>
    kind === "adult" ? t("common.adults") : kind === "child" ? t("common.children") : kind === "infant" ? t("common.infants")
      : kind === "transport" ? t("common.transfer") : label ?? "";

  if (!page.slots.length) {
    return <p className="rounded-card border border-line bg-surface p-6">{t("widget.noDates")}</p>;
  }

  return (
    <section id="book" aria-label={t("widget.label")} className="flex min-w-0 scroll-mt-4 flex-col gap-5 rounded-card border border-line bg-surface p-5 md:p-6">
      {adult && (
        <div>
          <div className="text-small text-ink-muted">{t("widget.from")}</div>
          <div className="flex items-baseline gap-2"><span className="text-[32px] font-bold leading-tight">{money(adult.price_minor)}</span><span className="text-ink-muted">{t("widget.perAdult")}</span></div>
          <div className="text-small text-ink-muted">
            {rate ? `${approxDisplay(adult.price_minor, rate, display, locale)} · ` : ""}{t("widget.payIn", { currency: page.currency })}
          </div>
        </div>
      )}

      <fieldset className="flex min-w-0 flex-col gap-2">
        <legend className="mb-2 flex items-center gap-2 text-small font-bold"><IconCalendar size={18} className="text-discovery" />{t("widget.date")}</legend>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {days.map(([k, slots]) => {
            const d = new Date(slots[0].starts_at);
            const active = k === day;
            return (
              <button key={k} type="button" aria-pressed={active} onClick={() => pickDay(k)}
                className={`tab-chip btn-press flex min-h-16 min-w-16 flex-col items-center justify-center rounded-control border px-2 ${active ? "border-discovery bg-discovery text-white" : "border-[#C9CDDA] bg-surface"}`}>
                <span className="text-[12px]">{format.dateTime(d, { weekday: "short" })}</span>
                <span className="font-bold">{format.dateTime(d, { day: "numeric" })}</span>
                <span className="text-[12px]">{format.dateTime(d, { month: "short" })}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="min-w-0">
        <legend className="mb-2 text-small font-bold">{t("widget.departure")}</legend>
        <div className="flex flex-wrap gap-2">
          {daySlots.map((s) => {
            const full = s.seats_left <= 0;
            const active = s.id === slotId;
            return (
              <button key={s.id} type="button" disabled={full} aria-pressed={active} onClick={() => setSlotId(s.id)}
                className={`tab-chip btn-press min-h-11 rounded-control border px-4 font-semibold ${active ? "border-discovery bg-discovery text-white" : full ? "border-line bg-[#F3F4F8] text-[#6B7189] line-through" : "border-[#C9CDDA] bg-surface"}`}>
                {format.dateTime(new Date(s.starts_at), { hour: "2-digit", minute: "2-digit" })}{full ? ` · ${t("widget.full")}` : ""}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-3">
        <div className="text-small font-bold">{t("widget.travelers")}</div>
        {stepper("adults", t("common.adults"), ageLabel("adult"))}
        {priceOf(page, "child") && stepper("children", t("common.children"), ageLabel("child"))}
        {priceOf(page, "infant") && stepper("infants", t("common.infants"), ageLabel("infant"))}
        {notEnough && slot && <p role="alert" className="reveal-in text-small font-semibold text-critical">{t("widget.notEnough", { n: slot.seats_left })}</p>}
      </div>

      {page.prices.some((pr) => pr.kind === "transport") && (
        <div className="flex flex-col gap-2 rounded-card border border-line p-4">
          <label className="flex items-center gap-3 font-semibold">
            <input type="checkbox" checked={sel.transport} onChange={(e) => setSel({ ...sel, transport: e.target.checked })} className="h-5 w-5 accent-discovery" />
            {t("widget.addTransfer")}
          </label>
          {sel.transport && (
            <div className="reveal-in flex flex-col gap-2">
              <label htmlFor="hotel" className="text-small text-ink-muted">{t("widget.yourHotel")}</label>
              <select id="hotel" value={sel.hotelId ?? ""} onChange={(e) => setSel({ ...sel, hotelId: e.target.value || null })}
                className="min-h-11 rounded-control border border-[#8A90A6] bg-surface px-3">
                <option value="">{t("widget.chooseHotel")}</option>
                {[...new Set(page.hotels.map((h) => h.zone))].map((zone) => (
                  <optgroup key={zone} label={zone}>
                    {page.hotels.filter((h) => h.zone === zone).map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                  </optgroup>
                ))}
              </select>
              {hotel && tr && (
                <p className="text-small text-ink-muted">
                  {tr.per === "vehicle"
                    ? t("widget.perCar", { zone: hotel.zone, price: money(tr.price_minor), cap: tr.vehicle_capacity ?? 0 })
                    : t("widget.perPersonZone", { zone: hotel.zone, price: money(tr.price_minor) })}
                </p>
              )}
              {p.transportUnavailable && <p role="alert" className="text-small font-semibold text-critical">{t("widget.noTransfer")}</p>}
            </div>
          )}
        </div>
      )}

      {page.extras.length > 0 && (
        <fieldset className="flex min-w-0 flex-col gap-2">
          <legend className="mb-1 text-small font-bold">{t("widget.extras")}</legend>
          {page.extras.map((x) => (
            <label key={x.id} className="flex items-center gap-3">
              <input type="checkbox" className="h-5 w-5 accent-discovery" checked={sel.extras.includes(x.id)}
                onChange={(e) => setSel({ ...sel, extras: e.target.checked ? [...sel.extras, x.id] : sel.extras.filter((id) => id !== x.id) })} />
              <span><span className="font-semibold">{x.name}</span>{" "}
                <span className="text-ink-muted">+{money(x.price_minor)} {x.per === "booking" ? t("widget.perBooking") : t("widget.perPerson")}</span></span>
            </label>
          ))}
        </fieldset>
      )}

      <div className="flex flex-col gap-1.5 border-t border-line pt-4">
        {p.lines.map((l) => (
          <div key={l.key} className="reveal-in flex justify-between gap-3">
            <span>{l.quantity} × {lineLabel(l.kind, l.label)}</span><span className="tabular-nums">{money(l.total)}</span>
          </div>
        ))}
        <div className="mt-1 flex items-baseline justify-between">
          <span className="text-[17px] font-bold">{t("common.total")}</span>
          <span key={p.total} className="value-tick text-[24px] font-bold tabular-nums">{money(p.total)}</span>
        </div>
        {rate && <div className="text-end text-small text-ink-muted">{t("common.approx", { amount: approxDisplay(p.total, rate, display, locale) ?? "" })}</div>}
        {currencies.length > 1 && (
          <label className="mt-1 flex items-center justify-end gap-2 text-small text-ink-muted">
            {t("widget.showIn")}
            <select value={display} onChange={(e) => setDisplay(e.target.value)} className="min-h-9 rounded-control border border-line bg-surface px-2 text-ink">
              {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
        )}
      </div>

      <button type="button" disabled={!canContinue || navigating} onClick={go} aria-busy={navigating}
        className="btn-press inline-flex items-center justify-center gap-2 min-h-13 rounded-control bg-discovery text-[16px] font-bold text-white hover:bg-discovery-hover active:bg-discovery-pressed disabled:cursor-not-allowed disabled:bg-line disabled:text-ink-muted">
        {navigating && <span className="spinner" aria-hidden="true" />}
        {slot ? t("widget.continue") : t("widget.chooseDeparture")}
      </button>

      <div className="flex flex-col gap-2 text-[14px]">
        {page.policy && <div className="flex gap-2"><IconCheck size={20} className="shrink-0 text-success" />{t("widget.freeCancel", { hours: page.policy.free_cancel_hours })}</div>}
        <div className="flex gap-2"><IconCash size={20} className="shrink-0 text-discovery" />{t("widget.cash")}</div>
      </div>
    </section>
  );
}
