"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ExperienceCard } from "@/lib/data/types";
import { cardImages } from "@/lib/catalog";
import { mediaSrc } from "@/lib/media";
import { formatMoney } from "@/lib/money";
import { CITIES, GOVERNORATES, distanceTo, type City } from "@/lib/places";
import { indexCards } from "@/lib/search";
import { themeFor } from "@/lib/themes";
import { IconCalendar, IconCheck, IconClock, IconPin, IconSpark } from "../Icons";
import { useCity } from "./CityPicker";

type Slot = { id: string; starts_at: string; seats_left: number };
type Trip = { id: string; slug: string; title: string | null; duration_minutes: number | null; slots: Slot[] };
type Group = "couple" | "family" | "friends" | "solo";
type Pace = "relaxed" | "balanced" | "full";
type Budget = "any" | "value" | "mid";
const INTERESTS = ["sea", "diving", "desert", "history", "souk", "nile", "wellness", "water", "evening", "nature"] as const;
type Interest = (typeof INTERESTS)[number];

// what each interest means in trip "ideas" (see lib/search)
const MEANS: Record<Interest, string[]> = {
  sea: ["boat", "beach", "island", "snorkel", "dolphin", "submarine"], diving: ["dive", "snorkel", "wreck"], desert: ["desert", "quad", "camel", "stars"],
  history: ["history"], souk: ["market", "food"], nile: ["nile", "balloon"], wellness: ["spa"], water: ["water", "fishing"],
  evening: ["night", "sunset", "food"], nature: ["hike", "stars", "horse"],
};
// rough per-person ceilings in EUR (budget is a preference, not a filter); EGP/USD converted approximately
const TO_EUR: Record<string, number> = { EUR: 1, USD: 0.92, EGP: 0.019 };
const CEIL: Record<Budget, number> = { any: Infinity, value: 35, mid: 75 };

const cairoDay = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);

type Scored = { card: ExperienceCard; score: number; why: string[]; km: number | null };
type Placed = { card: ExperienceCard; trip: Trip; slot: Slot; why: string[]; km: number | null };

/**
 * "Plan it for me": a few questions (where you stay, dates, who's coming, what you like, pace, budget),
 * then WENRO picks matching trips near you and puts them on days with free seats. Nothing is booked
 * until the guest taps Book on a line.
 */
export function AutoPlan({ cards }: { cards: ExperienceCard[] }) {
  const t = useTranslations();
  const p = (k: string, v?: Record<string, string | number>) => t(`planner.${k}` as "planner.title", v as never);
  const locale = useLocale();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
  const [city, setCity] = useCity();
  const [step, setStep] = useState(0);
  const [from, setFrom] = useState(addDays(today, 1));
  const [to, setTo] = useState(addDays(today, 6));
  const [adults, setAdults] = useState(2);
  const [kids, setKids] = useState(0);
  const [group, setGroup] = useState<Group>("couple");
  const [likes, setLikes] = useState<Interest[]>([]);
  const [pace, setPace] = useState<Pace>("balanced");
  const [budget, setBudget] = useState<Budget>("any");
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<{ days: Record<string, Placed[]>; spare: Scored[] } | null>(null);
  const index = useMemo(() => indexCards(cards), [cards]);
  const nights = Math.max(1, Math.round((Date.parse(to) - Date.parse(from)) / 864e5) + 1);
  const people = adults + kids;
  const cityName = (c: City) => t(`places.city.${c.slug}` as "places.city.hurghada");

  /** Every trip gets a score and the reasons behind it. */
  const score = (): Scored[] => index.map(({ card, ideas }) => {
    let s = 0; const why: string[] = [];
    const hits = likes.filter((l) => MEANS[l].some((k) => ideas.has(k)));
    if (likes.length) { s += hits.length * 5; if (hits.length) why.push(p("why.likes", { what: hits.map((h) => p(`likes.${h}`)).join(" · ") })); else s -= 4; }
    const km = city ? distanceTo(city, card) : null;
    if (city) {
      if (km == null) s -= 2;
      else if (km <= 25) { s += 5; why.push(p("why.inCity", { city: cityName(city) })); }
      else if (km <= 90) { s += 3; why.push(p("why.near", { km: Math.round(km) })); }
      else if (km <= 300) { s -= 1; why.push(p("why.dayTrip", { km: Math.round(km) })); }
      else s -= 12;
    }
    if (group === "family" || kids > 0) {
      if (ideas.has("family") || card.category === "family") { s += 3; why.push(p("why.family")); }
      if (ideas.has("dive") || ideas.has("quad")) s -= 2;
    }
    if (group === "couple" && (ideas.has("sunset") || ideas.has("private") || ideas.has("spa"))) { s += 2; why.push(p("why.couple")); }
    if (group === "friends" && (ideas.has("quad") || ideas.has("water") || ideas.has("night"))) { s += 2; why.push(p("why.friends")); }
    const eur = card.from_minor != null ? (card.from_minor / 100) * (TO_EUR[card.currency] ?? 1) : null;
    if (eur != null && eur > CEIL[budget]) s -= 4; else if (budget !== "any" && eur != null) why.push(p("why.budget"));
    if (card.reviews && card.rating) { s += Number(card.rating) - 3; if (Number(card.rating) >= 4.5) why.push(p("why.loved", { r: Number(card.rating).toFixed(1) })); }
    return { card, score: s, why: why.slice(0, 3), km };
  }).sort((a, b) => b.score - a.score);

  const make = async () => {
    setBusy(true);
    try {
      const ranked = score().filter((x) => x.score > -6);
      // the best 36 matches, asked in groups of 12 (the most the seats lookup takes at once)
      const short = ranked.slice(0, 36);
      const groups = Array.from({ length: Math.ceil(short.length / 12) }, (_, i) => short.slice(i * 12, i * 12 + 12));
      const lists = await Promise.all(groups.map((g) => fetch(`/api/plan?ids=${g.map((x) => x.card.id).join(",")}&from=${from}&to=${to}&locale=${locale}`)
        .then((r) => r.json()).catch(() => [])));
      const byId = new Map(lists.flatMap((l: Trip[]) => (Array.isArray(l) ? l : [])).map((x) => [x.id, x]));
      const days: Record<string, Placed[]> = {};
      const used: Record<string, { start: number; end: number; long: boolean }[]> = {};
      const themeOn: Record<string, string> = {};
      const cap = pace === "full" ? 2 : 1;
      const restDay = (d: string) => { const i = Math.round((Date.parse(d) - Date.parse(from)) / 864e5); return pace === "relaxed" ? i % 2 === 1 : pace === "balanced" ? i % 4 === 3 : false; };
      const fits = (tr: Trip, s: Slot, strictTheme: boolean, theme: string) => {
        const d = cairoDay(s.starts_at); if (d < from || d > to || restDay(d) || s.seats_left < people) return false;
        const dur = (tr.duration_minutes ?? 240) * 60_000, st = Date.parse(s.starts_at), long = dur >= 6 * 3600_000;
        const u = used[d] ?? [];
        if (u.length >= cap || (u.length && (long || u.some((x) => x.long)))) return false;
        if (!u.every((x) => st >= x.end + 3600_000 || st + dur + 3600_000 <= x.start)) return false;
        if (strictTheme && (themeOn[addDays(d, -1)] === theme || themeOn[addDays(d, 1)] === theme || themeOn[d] === theme)) return false;
        return true;
      };
      const spare: Scored[] = [];
      const placed = new Set<string>();
      for (const strict of [true, false]) {
        for (const x of short) {
          if (placed.has(x.card.id)) continue;
          const tr = byId.get(x.card.id); if (!tr) continue;
          const theme = themeFor(x.card);
          const s = tr.slots.find((sl) => fits(tr, sl, strict, theme)); if (!s) continue;
          const d = cairoDay(s.starts_at), st = Date.parse(s.starts_at), dur = (tr.duration_minutes ?? 240) * 60_000;
          (used[d] ??= []).push({ start: st, end: st + dur, long: dur >= 6 * 3600_000 });
          themeOn[d] = theme;
          (days[d] ??= []).push({ card: x.card, trip: tr, slot: s, why: x.why, km: x.km });
          placed.add(x.card.id);
        }
      }
      for (const x of ranked) if (!placed.has(x.card.id) && spare.length < 4 && x.score > 0) spare.push(x);
      for (const d of Object.keys(days)) days[d].sort((a, b) => a.slot.starts_at.localeCompare(b.slot.starts_at));
      setPlan({ days, spare });
      setStep(6);
    } finally { setBusy(false); }
  };

  const steps = ["where", "when", "who", "likes", "pace", "budget"] as const;
  const chip = (on: boolean) => `btn-press inline-flex min-h-12 items-center gap-2 rounded-control border-2 px-4 text-start font-bold ${on ? "border-discovery bg-discovery-tint text-discovery" : "border-line bg-surface hover:border-discovery"}`;
  const field = "min-h-11 rounded-control border border-[#8A90A6] bg-white px-3";
  const fmtDay = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" });
  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Cairo" });
  const count = plan ? Object.values(plan.days).reduce((a, x) => a + x.length, 0) : 0;

  if (step === 6 && plan) {
    return (
      <section aria-live="polite" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-aqua p-4">
          <div>
            <p className="text-h3 font-extrabold">{p("resultTitle", { n: count, days: nights })}</p>
            <p className="text-small text-ink/80">{[city ? cityName(city) : t("places.egypt"), p(`groups.${group}`), p(`paces.${pace}`), ...likes.map((l) => p(`likes.${l}`))].join(" · ")}</p>
          </div>
          <button type="button" onClick={() => setStep(0)} className="btn-press min-h-11 rounded-full border border-ink px-4 font-bold">{p("edit")}</button>
        </div>
        {count === 0 && <p className="rounded-card border border-dashed border-line p-6 text-center text-ink-muted">{p("nothing")}</p>}
        <ol className="flex flex-col gap-3">
          {Array.from({ length: nights }, (_, i) => addDays(from, i)).map((d) => (
            <li key={d} className="rounded-card border border-line bg-surface p-4">
              <div className="mb-2 font-bold">{fmtDay(d)}</div>
              {(plan.days[d] ?? []).length === 0 ? <p className="text-small text-ink-muted">{p("free")}</p> : (
                <ul className="flex flex-col gap-2">
                  {plan.days[d].map(({ card, trip, slot, why }) => {
                    const img = cardImages(card)[0];
                    return (
                      <li key={card.id} className="flex flex-wrap items-center gap-3 rounded-control bg-apricot-tint p-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {img && <img src={mediaSrc(img, { w: 120, h: 120 })} alt="" className="size-14 shrink-0 rounded-[10px] object-cover" loading="lazy" />}
                        <span className="min-w-0 flex-1">
                          <Link href={`/experiences/${card.slug}`} className="block font-bold hover:underline">{trip.title ?? card.title}</Link>
                          <span className="inline-flex items-center gap-1 text-small"><IconClock size={14} />{fmtTime(slot.starts_at)} · {t("plan.seats", { n: slot.seats_left })}
                            {card.from_minor != null && <> · {formatMoney({ minor: card.from_minor, currency: card.currency }, locale)}</>}</span>
                          {why.length > 0 && <span className="mt-1 flex flex-wrap gap-1">{why.map((w) => <span key={w} className="rounded-full bg-white/80 px-2 py-0.5 text-[12px] font-semibold">{w}</span>)}</span>}
                        </span>
                        <Link href={{ pathname: `/book/${card.slug}`, query: { s: slot.id, a: String(adults), ...(kids ? { c: String(kids) } : {}) } }}
                          className="btn-press inline-flex min-h-11 items-center rounded-control bg-discovery px-4 text-small font-bold text-white">{t("plan.book")}</Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          ))}
        </ol>
        {plan.spare.length > 0 && (
          <div className="rounded-card border border-line p-4">
            <p className="mb-2 font-bold">{p("alsoLike")}</p>
            <ul className="flex flex-col gap-1">{plan.spare.map((x) => (
              <li key={x.card.id}><Link href={`/experiences/${x.card.slug}`} className="flex min-h-11 items-center justify-between gap-2 rounded-control px-2 hover:bg-discovery-tint">
                <span className="truncate font-semibold">{x.card.title}</span><span className="shrink-0 text-small text-ink-muted">{x.why[0] ?? ""}</span></Link></li>
            ))}</ul>
          </div>
        )}
        <p className="text-small text-ink-muted">{p("note")}</p>
      </section>
    );
  }

  const key = steps[step];
  return (
    <section className="rounded-card border border-line bg-surface p-5 md:p-7">
      <div className="mb-5 flex items-center gap-2" aria-hidden="true">
        {steps.map((s, i) => <span key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-discovery" : "bg-line"}`} />)}
      </div>
      <p className="text-small font-bold uppercase tracking-wider text-ink-muted">{p("stepOf", { n: step + 1, of: steps.length })}</p>
      <h2 className="mb-4 font-display text-[24px] font-black leading-tight md:text-[28px]">{p(`q.${key}`)}</h2>

      {key === "where" && (
        <div className="flex flex-col gap-4">
          {GOVERNORATES.map((g) => (
            <div key={g}>
              <p className="mb-1.5 text-small font-bold text-ink-muted">{t(`places.gov.${g}` as "places.gov.redsea")}</p>
              <div className="flex flex-wrap gap-2">{CITIES.filter((c) => c.gov === g).map((c) => (
                <button key={c.slug} type="button" aria-pressed={city?.slug === c.slug} onClick={() => setCity(c.slug)} className={chip(city?.slug === c.slug)}>
                  <IconPin size={16} className="text-apricot" />{cityName(c)}
                </button>
              ))}</div>
            </div>
          ))}
          <button type="button" aria-pressed={!city} onClick={() => setCity(null)} className={chip(!city)}>{t("places.all")}</button>
        </div>
      )}
      {key === "when" && (
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="flex flex-col gap-1 text-small font-bold">{t("plan.from")}<input type="date" value={from} min={today} onChange={(e) => { setFrom(e.target.value); if (e.target.value > to) setTo(addDays(e.target.value, 5)); }} className={field} /></label>
          <label className="flex flex-col gap-1 text-small font-bold">{t("plan.to")}<input type="date" value={to} min={from} max={addDays(from, 20)} onChange={(e) => setTo(e.target.value)} className={field} /></label>
          <label className="flex flex-col gap-1 text-small font-bold">{p("adults")}<input type="number" min={1} max={20} value={adults} onChange={(e) => setAdults(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} className={field} /></label>
          <label className="flex flex-col gap-1 text-small font-bold">{p("kids")}<input type="number" min={0} max={10} value={kids} onChange={(e) => setKids(Math.max(0, Math.min(10, Number(e.target.value) || 0)))} className={field} /></label>
        </div>
      )}
      {key === "who" && (
        <div className="grid gap-2 sm:grid-cols-2">{(["couple", "family", "friends", "solo"] as Group[]).map((g) => (
          <button key={g} type="button" aria-pressed={group === g} onClick={() => setGroup(g)} className={chip(group === g)}>{group === g && <IconCheck size={18} />}{p(`groups.${g}`)}</button>
        ))}</div>
      )}
      {key === "likes" && (
        <>
          <p className="-mt-2 mb-3 text-small text-ink-muted">{p("likesHint")}</p>
          <div className="flex flex-wrap gap-2">{INTERESTS.map((l) => (
            <button key={l} type="button" aria-pressed={likes.includes(l)} onClick={() => setLikes((x) => x.includes(l) ? x.filter((y) => y !== l) : [...x, l])} className={chip(likes.includes(l))}>
              {likes.includes(l) && <IconCheck size={18} />}{p(`likes.${l}`)}
            </button>
          ))}</div>
        </>
      )}
      {key === "pace" && (
        <div className="grid gap-2">{(["relaxed", "balanced", "full"] as Pace[]).map((x) => (
          <button key={x} type="button" aria-pressed={pace === x} onClick={() => setPace(x)} className={`${chip(pace === x)} flex-col !items-start py-3`}>
            <span>{p(`paces.${x}`)}</span><span className="text-small font-normal text-ink-muted">{p(`paceHint.${x}`)}</span>
          </button>
        ))}</div>
      )}
      {key === "budget" && (
        <div className="grid gap-2 sm:grid-cols-3">{(["value", "mid", "any"] as Budget[]).map((x) => (
          <button key={x} type="button" aria-pressed={budget === x} onClick={() => setBudget(x)} className={`${chip(budget === x)} flex-col !items-start py-3`}>
            <span>{p(`budgets.${x}`)}</span><span className="text-small font-normal text-ink-muted">{p(`budgetHint.${x}`)}</span>
          </button>
        ))}</div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        {step > 0 ? <button type="button" onClick={() => setStep(step - 1)} className="min-h-11 px-2 font-semibold text-ink-muted hover:underline">{p("back")}</button> : <span />}
        {step < steps.length - 1
          ? <button type="button" onClick={() => setStep(step + 1)} className="btn-press inline-flex min-h-12 items-center rounded-control bg-discovery px-6 font-bold text-white hover:bg-discovery-hover">{p("next")}</button>
          : <button type="button" onClick={make} disabled={busy} className="btn-press inline-flex min-h-12 items-center gap-2 rounded-control bg-apricot px-6 font-extrabold text-ink hover:bg-apricot-hover disabled:opacity-60">
              {busy ? <IconCalendar size={20} /> : <IconSpark size={20} />}{busy ? t("plan.planning") : p("make", { days: nights })}
            </button>}
      </div>
    </section>
  );
}
