"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ExperienceCard } from "@/lib/data/types";
import { mediaSrc } from "@/lib/media";
import { cardImages } from "@/lib/catalog";
import { IconCalendar, IconCheck, IconClock } from "../Icons";

type Slot = { id: string; starts_at: string; seats_left: number };
type Trip = { id: string; slug: string; title: string | null; duration_minutes: number | null; slots: Slot[] };
type Pick = { trip: Trip; slot: Slot };

const cairoDay = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);

/**
 * Plan my week: the guest picks trips (their wishlist is pre-selected) and their holiday dates; the planner
 * puts each trip on a day with free seats, one big trip per day, so nothing overlaps. Every line books in one tap.
 */
export function PlanWeek({ cards }: { cards: ExperienceCard[] }) {
  const t = useTranslations("plan");
  const locale = useLocale();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
  const [from, setFrom] = useState(addDays(today, 1));
  const [to, setTo] = useState(addDays(today, 7));
  const [people, setPeople] = useState(2);
  const [chosen, setChosen] = useState<string[]>([]);
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try { const w = JSON.parse(localStorage.getItem("wenro.wishlist") ?? "[]"); if (Array.isArray(w)) setChosen(w.filter((id: string) => cards.some((c) => c.id === id)).slice(0, 12)); } catch { /* private mode */ }
  }, [cards]);

  const plan = async () => {
    if (!chosen.length) return;
    setBusy(true);
    try { setTrips(await (await fetch(`/api/plan?ids=${chosen.join(",")}&from=${from}&to=${to}&locale=${locale}`)).json()); }
    finally { setBusy(false); }
  };

  const result = useMemo(() => {
    if (!trips) return null;
    const days: Record<string, Pick[]> = {};
    const left: Trip[] = [];
    const busyUntil: Record<string, { start: number; end: number }[]> = {};
    // trips with the fewest options are placed first
    const order = [...trips].sort((a, b) => a.slots.length - b.slots.length);
    for (const tr of order) {
      const dur = (tr.duration_minutes ?? 240) * 60_000;
      const ok = tr.slots.filter((s) => s.seats_left >= people).find((s) => {
        const d = cairoDay(s.starts_at), st = Date.parse(s.starts_at);
        const used = busyUntil[d] ?? [];
        const long = dur >= 6 * 3600_000 || used.some((u) => u.end - u.start >= 6 * 3600_000);
        return !(long && used.length) && used.length < 2 && used.every((u) => st >= u.end + 3600_000 || st + dur + 3600_000 <= u.start);
      });
      if (!ok) { left.push(tr); continue; }
      const d = cairoDay(ok.starts_at), st = Date.parse(ok.starts_at);
      (busyUntil[d] ??= []).push({ start: st, end: st + dur });
      (days[d] ??= []).push({ trip: tr, slot: ok });
    }
    for (const d of Object.keys(days)) days[d].sort((a, b) => a.slot.starts_at.localeCompare(b.slot.starts_at));
    return { days, left };
  }, [trips, people]);

  const fmtDay = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" });
  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Cairo" });
  const field = "min-h-11 rounded-control border border-[#8A90A6] bg-white px-3";
  const toggle = (id: string) => setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length >= 12 ? c : [...c, id]));
  const nights = Math.max(0, Math.round((Date.parse(to) - Date.parse(from)) / 864e5) + 1);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
      <section aria-labelledby="pick-h">
        <div className="mb-4 grid gap-3 rounded-card border border-line p-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-small font-bold">{t("from")}<input type="date" value={from} min={today} onChange={(e) => { setFrom(e.target.value); if (e.target.value > to) setTo(addDays(e.target.value, 6)); }} className={field} /></label>
          <label className="flex flex-col gap-1 text-small font-bold">{t("to")}<input type="date" value={to} min={from} max={addDays(from, 30)} onChange={(e) => setTo(e.target.value)} className={field} /></label>
          <label className="flex flex-col gap-1 text-small font-bold">{t("people")}<input type="number" min={1} max={20} value={people} onChange={(e) => setPeople(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} className={field} /></label>
        </div>
        <h2 id="pick-h" className="mb-1 text-h3 font-bold">{t("pickTitle", { n: chosen.length })}</h2>
        <p className="mb-3 text-small text-ink-muted">{t("pickHint")}</p>
        <ul className="grid max-h-[520px] gap-2 overflow-y-auto pe-1 sm:grid-cols-2">
          {cards.map((c) => {
            const on = chosen.includes(c.id), img = cardImages(c)[0];
            return (
              <li key={c.id}>
                <button type="button" onClick={() => toggle(c.id)} aria-pressed={on}
                  className={`btn-press flex w-full items-center gap-3 rounded-card border p-2 text-start ${on ? "border-discovery bg-discovery-tint" : "border-line hover:border-discovery"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {img && <img src={mediaSrc(img, { w: 120, h: 120 })} alt="" className="size-14 shrink-0 rounded-[10px] object-cover" loading="lazy" />}
                  <span className="line-clamp-2 flex-1 text-small font-semibold">{c.title}</span>
                  <span className={`grid size-6 shrink-0 place-items-center rounded-full border ${on ? "border-discovery bg-discovery text-white" : "border-line"}`}>{on && <IconCheck size={14} />}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <button type="button" onClick={plan} disabled={!chosen.length || busy}
          className="btn-press mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-control bg-discovery font-bold text-white hover:bg-discovery-hover disabled:opacity-50">
          <IconCalendar size={20} />{busy ? t("planning") : t("make", { days: nights })}
        </button>
      </section>

      <section aria-labelledby="plan-h" aria-live="polite">
        <h2 id="plan-h" className="mb-3 text-h3 font-bold">{t("yourPlan")}</h2>
        {!result ? <p className="rounded-card border border-dashed border-line p-6 text-center text-ink-muted">{t("empty")}</p> : (
          <ol className="flex flex-col gap-3">
            {Array.from({ length: nights }, (_, i) => addDays(from, i)).map((d) => (
              <li key={d} className="rounded-card border border-line p-4">
                <div className="mb-2 font-bold">{fmtDay(d)}</div>
                {(result.days[d] ?? []).length === 0 ? <p className="text-small text-ink-muted">{t("free")}</p> : (
                  <ul className="flex flex-col gap-2">
                    {result.days[d].map(({ trip, slot }) => (
                      <li key={trip.id} className="flex flex-wrap items-center justify-between gap-2 rounded-control bg-apricot-tint p-3">
                        <span className="min-w-0"><b className="block">{trip.title}</b>
                          <span className="inline-flex items-center gap-1 text-small"><IconClock size={14} />{fmtTime(slot.starts_at)} · {t("seats", { n: slot.seats_left })}</span></span>
                        <Link href={{ pathname: `/book/${trip.slug}`, query: { s: slot.id, a: String(people) } }}
                          className="btn-press inline-flex min-h-10 items-center rounded-control bg-discovery px-4 text-small font-bold text-white">{t("book")}</Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
            {result.left.length > 0 && (
              <li className="rounded-card bg-warning-tint p-4 text-small text-warning">
                {t("noRoom")} {result.left.map((x) => x.title).join(" · ")}
              </li>
            )}
          </ol>
        )}
      </section>
    </div>
  );
}
