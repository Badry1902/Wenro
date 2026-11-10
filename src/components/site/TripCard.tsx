"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ExperienceCard } from "@/lib/data/types";
import { formatMoney } from "@/lib/money";
import { mediaSrc } from "@/lib/media";
import { cardImages } from "@/lib/catalog";
import { IconCar, IconCheck, IconClock, IconStar } from "../Icons";
import { WishButton } from "./WishButton";
import { themeFor, patternStyle } from "@/lib/themes";
import { ThemeBadge } from "../brand/ThemeArt";

/**
 * Trip card. On hover (mouse) the photo slowly cycles through the trip's gallery with a cross-fade;
 * on touch screens the cover stays put. Dots show where you are.
 */
export function TripCard({ c, size = "md", priority = false }: { c: ExperienceCard; size?: "sm" | "md"; priority?: boolean }) {
  const t = useTranslations();
  const locale = useLocale();
  const imgs = cardImages(c).slice(0, 5);
  const [i, setI] = useState(0);
  const [armed, setArmed] = useState(false); // the other photos load only once someone hovers
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stop = () => { if (timer.current) clearInterval(timer.current); timer.current = null; setI(0); };
  const start = () => {
    if (imgs.length < 2 || timer.current || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setArmed(true);
    setI(1);
    timer.current = setInterval(() => setI((n) => (n + 1) % imgs.length), 1300);
  };
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const hours = c.duration_minutes ? c.duration_minutes / 60 : null;
  const duration = hours == null ? null : c.duration_minutes! < 60 ? t("experience.minutes", { n: c.duration_minutes! })
    : t("experience.hours", { n: Math.round(hours * 2) / 2 });
  const demo = c.slug.startsWith("demo-");
  const w = size === "sm" ? 480 : 640;
  const theme = themeFor(c);

  return (
    <article className="trip-card group relative flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface"
      onPointerEnter={(e) => e.pointerType === "mouse" && start()} onPointerLeave={stop}>
      <div className="relative aspect-[4/3] overflow-hidden" style={patternStyle(theme, "feature", 240)}>
        {(armed ? imgs : imgs.slice(0, 1)).map((src, n) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={src} src={mediaSrc(src, { w, h: Math.round(w * 0.75) })} alt={n === 0 ? (c.cover?.alt ?? "") : ""}
            loading={priority && n === 0 ? "eager" : "lazy"} aria-hidden={n === 0 ? undefined : true}
            className={`card-photo absolute inset-0 h-full w-full object-cover ${n === i ? "is-on" : ""}`} />
        ))}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/35 to-transparent" />
        {demo && <span className="absolute start-3 top-3 rounded-full bg-ink/80 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur">{t("home.demoTag")}</span>}
        <WishButton id={c.id} className="absolute end-3 top-3 z-10" />
        <ThemeBadge theme={theme} label={t(`themes.${theme}.name`)} className="absolute bottom-2 start-2.5 z-[1]" size={20} />
        {imgs.length > 1 && (
          <div className="absolute inset-x-0 bottom-2.5 flex justify-center gap-1" aria-hidden="true">
            {imgs.map((_, n) => <span key={n} className={`card-dot h-1.5 rounded-full bg-white ${n === i ? "w-4 opacity-100" : "w-1.5 opacity-60"}`} />)}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-small font-semibold uppercase tracking-wide text-ink-muted">
          {c.category && <span className="text-teal-ink">{t(`categories.${c.category}` as "categories.sea")}</span>}
          {duration && <span className="inline-flex items-center gap-1 normal-case tracking-normal"><IconClock size={14} />{duration}</span>}
        </span>
        <Link href={`/experiences/${c.slug}`} className="font-display text-[18px] font-extrabold leading-snug after:absolute after:inset-0 after:content-[''] group-hover:text-discovery line-clamp-2">
          {c.title}
        </Link>
        {c.reviews ? (
          <span className="inline-flex items-center gap-1 text-small" aria-label={t("reviews.cardLabel", { avg: c.rating ?? 0, n: c.reviews })}>
            <IconStar size={15} className="text-apricot" /><b className="text-ink">{Number(c.rating).toFixed(1)}</b>
            <span className="text-ink-muted">({c.reviews})</span>
          </span>
        ) : null}
        <span className="flex flex-col gap-0.5 text-small text-ink-muted">
          {c.free_cancel_hours ? <span className="inline-flex items-center gap-1 text-success"><IconCheck size={14} />{t("home.freeCancel", { h: c.free_cancel_hours })}</span> : null}
          {c.pickup ? <span className="inline-flex items-center gap-1"><IconCar size={14} />{t("home.pickup")}</span> : null}
        </span>
        {c.from_minor != null && (
          <span className="mt-auto pt-2 text-ink">
            <span className="text-small text-ink-muted">{t("widget.from")} </span>
            <span className="font-display text-[20px] font-black text-ink">{formatMoney({ minor: c.from_minor, currency: c.currency }, locale)}</span>
            <span className="text-small text-ink-muted"> {t("home.perPerson")}</span>
          </span>
        )}
      </div>
    </article>
  );
}
