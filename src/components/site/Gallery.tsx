"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { mediaSrc, videoPoster } from "@/lib/media";
import { VideoTile } from "../VideoTile";
import { IconChevron, IconClose, IconExpand, IconPause, IconPlay } from "../Icons";

type Item = { src: string; alt: string; kind?: "image" | "video" };
const STEP_MS = 5000;

/**
 * Trip gallery, cover-flow style: one large photo in front, the previous and next ones smaller and
 * turned slightly behind it on either side (like the folded W of the logo). It moves on by itself and
 * the photos glide into place; it pauses while you
 * hover, focus it, or the page is in the background, and stops for good once you take control.
 * Swipe on phones, arrow keys on keyboards, thumbnails below, full-screen view on click.
 */
export function Gallery({ items, placeholder }: { items: Item[]; placeholder: string }) {
  const t = useTranslations("gallery");
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hold, setHold] = useState(false); // hover / focus / hidden tab
  const [box, setBox] = useState(false);
  const [tick, setTick] = useState(0); // restarts the progress bar
  const stage = useRef<HTMLDivElement>(null);
  const thumbs = useRef<HTMLDivElement>(null);
  const n = items.length;

  const go = useCallback((to: number) => { setI(((to % n) + n) % n); setTick((x) => x + 1); }, [n]);
  const user = (to: number) => { setPlaying(false); go(to); };

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) setPlaying(false);
    const vis = () => setHold(document.hidden);
    document.addEventListener("visibilitychange", vis);
    return () => document.removeEventListener("visibilitychange", vis);
  }, []);
  const running = playing && !hold && !box && n > 1 && items[i]?.kind !== "video";
  useEffect(() => {
    if (!running) return;
    const id = setTimeout(() => go(i + 1), STEP_MS);
    return () => clearTimeout(id);
  }, [running, i, tick, go]);
  // keep the active thumbnail in view
  useEffect(() => {
    const el = thumbs.current?.querySelector<HTMLElement>(`[data-i="${i}"]`);
    el?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [i]);
  // lightbox keys
  useEffect(() => {
    if (!box) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBox(false);
      if (e.key === "ArrowRight") go(i + (document.dir === "rtl" ? -1 : 1));
      if (e.key === "ArrowLeft") go(i + (document.dir === "rtl" ? 1 : -1));
    };
    document.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.documentElement.style.overflow = ""; };
  }, [box, i, go]);

  // swipe
  const start = useRef<number | null>(null);
  const onDown = (e: React.PointerEvent) => { if (e.pointerType !== "mouse") start.current = e.clientX; };
  const onUp = (e: React.PointerEvent) => {
    if (start.current == null) return;
    const dx = e.clientX - start.current; start.current = null;
    if (Math.abs(dx) < 40) return;
    const rtl = document.dir === "rtl";
    user(i + ((dx < 0) !== rtl ? 1 : -1));
  };

  /** Where photo k sits relative to the front one: 0 front, -1/+1 beside it, ±2 waiting behind (wraps round). */
  const posOf = (k: number) => {
    let d = k - i;
    if (d > n / 2) d -= n;
    if (d < -n / 2) d += n;
    return Math.max(-2, Math.min(2, d));
  };

  if (n === 0) {
    return <div className="grid h-64 place-items-center rounded-image bg-discovery-tint text-small font-semibold text-ink-muted md:h-[460px]">{placeholder}</div>;
  }

  const slide = (it: Item, k: number, big: boolean) => it.kind === "video"
    ? <VideoTile src={mediaSrc(it.src, { w: big ? 1600 : 1280, h: big ? 1000 : 720 })} poster={videoPoster(it.src, { w: 1280, h: 720 })} label={it.alt} />
    // eslint-disable-next-line @next/next/no-img-element
    : <img src={mediaSrc(it.src, { w: big ? 1800 : 1280, h: big ? 1200 : 800 })} alt={it.alt} loading={k === 0 ? "eager" : "lazy"}
        className={big ? "max-h-full max-w-full object-contain" : "h-full w-full object-cover"} draggable={false} />;

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={stage}
        role="region"
        aria-roledescription="carousel"
        aria-label={t("label")}
        tabIndex={0}
        onKeyDown={(e) => {
          const rtl = document.dir === "rtl";
          if (e.key === "ArrowRight") user(i + (rtl ? -1 : 1));
          if (e.key === "ArrowLeft") user(i + (rtl ? 1 : -1));
        }}
        onPointerEnter={(e) => e.pointerType === "mouse" && setHold(true)}
        onPointerLeave={() => setHold(false)}
        onFocus={() => setHold(true)}
        onBlur={() => setHold(false)}
        onPointerDown={onDown}
        onPointerUp={onUp}
        className="cf-stage group relative h-72 select-none overflow-x-clip outline-none sm:h-96 md:h-[480px]"
      >
        {items.map((it, k) => {
          const pos = posOf(k);
          return (
            <div key={it.src} data-pos={pos} className="cf-slide absolute inset-y-0 start-1/2 overflow-hidden rounded-image bg-ink shadow-[0_30px_60px_-30px_rgb(18_24_48/0.55)]"
              aria-hidden={k !== i} role="group" aria-roledescription="slide" aria-label={t("photoN", { n: k + 1, total: n })}
              onClick={pos === -1 || pos === 1 ? () => user(k) : undefined}>
              {/* the photo in front, the two beside it and the next ones are loaded */}
              {Math.abs(pos) <= 2 ? slide(it, k, false) : null}
              <span className="cf-shade pointer-events-none absolute inset-0 bg-ink" />
            </div>
          );
        })}

        {/* Controls sit on the front photo */}
        <div className="cf-front pointer-events-none absolute inset-y-0 start-1/2 z-[5]">
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 rounded-b-image bg-gradient-to-t from-black/50 to-transparent" />
          {n > 1 && (
            <>
              <button type="button" onClick={() => user(i - 1)} aria-label={t("prev")}
                className="btn-press pointer-events-auto absolute start-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink shadow-md backdrop-blur">
                <IconChevron size={20} className="-scale-x-100" />
              </button>
              <button type="button" onClick={() => user(i + 1)} aria-label={t("next")}
                className="btn-press pointer-events-auto absolute end-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink shadow-md backdrop-blur">
                <IconChevron size={20} />
              </button>
            </>
          )}
          <div className="pointer-events-auto absolute inset-x-4 bottom-3 flex items-center gap-3 text-white">
            {n > 1 && (
              <button type="button" onClick={() => setPlaying((p) => !p)} aria-label={playing ? t("pause") : t("play")} aria-pressed={!playing}
                className="btn-press grid size-9 place-items-center rounded-full bg-black/35 backdrop-blur hover:bg-black/55">
                {playing ? <IconPause size={16} /> : <IconPlay size={16} />}
              </button>
            )}
            {n > 1 && (
              <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/30" aria-hidden="true">
                <div key={`${i}-${tick}-${running}`} className={`g-progress absolute inset-0 rounded-full bg-white ${running ? "run" : ""}`}
                  style={{ ["--g-ms" as string]: `${STEP_MS}ms`, transform: running ? undefined : "scaleX(0)" }} />
              </div>
            )}
            <span className="rounded-full bg-black/35 px-2.5 py-1 text-small font-bold tabular-nums backdrop-blur" aria-live="polite">{i + 1} / {n}</span>
            <button type="button" onClick={() => setBox(true)} aria-label={t("showAll", { n })}
              className="btn-press inline-flex min-h-9 items-center gap-1.5 rounded-full bg-white px-3 text-small font-bold text-ink hover:bg-discovery-tint">
              <IconExpand size={16} /><span className="hidden sm:inline">{t("showAll", { n })}</span>
            </button>
          </div>
        </div>
      </div>

      {n > 1 && (
        <div ref={thumbs} className="rail flex gap-2 overflow-x-auto pb-1">
          {items.map((it, k) => (
            <button key={it.src} type="button" data-i={k} onClick={() => user(k)} aria-label={t("photoN", { n: k + 1, total: n })}
              aria-current={k === i ? "true" : undefined}
              className="g-thumb btn-press relative h-16 w-24 shrink-0 overflow-hidden rounded-[12px] opacity-70 hover:opacity-100 md:h-20 md:w-28">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.kind === "video" ? (videoPoster(it.src, { w: 224, h: 160 }) ?? "") : mediaSrc(it.src, { w: 224, h: 160 })} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {box && (
        <div className="lightbox fixed inset-0 z-[60] flex flex-col bg-black/95 text-white" role="dialog" aria-modal="true" aria-label={t("label")}>
          <div className="flex items-center justify-between p-3">
            <span className="px-2 text-small font-bold tabular-nums">{t("photoN", { n: i + 1, total: n })}</span>
            <button type="button" onClick={() => setBox(false)} aria-label={t("close")} autoFocus className="btn-press grid size-11 place-items-center rounded-full hover:bg-white/15"><IconClose /></button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-4 md:px-16" onPointerDown={onDown} onPointerUp={onUp}>
            {items.map((it, k) => (
              <div key={it.src} className={`g-slide absolute inset-0 flex items-center justify-center p-2 md:p-6 ${k === i ? "is-on" : ""}`} aria-hidden={k !== i}>
                {Math.abs(k - i) <= 1 ? slide(it, k, true) : null}
              </div>
            ))}
            {n > 1 && (
              <>
                <button type="button" onClick={() => go(i - 1)} aria-label={t("prev")} className="btn-press absolute start-3 z-[2] grid size-12 place-items-center rounded-full bg-white/15 hover:bg-white/25"><IconChevron className="-scale-x-100" /></button>
                <button type="button" onClick={() => go(i + 1)} aria-label={t("next")} className="btn-press absolute end-3 z-[2] grid size-12 place-items-center rounded-full bg-white/15 hover:bg-white/25"><IconChevron /></button>
              </>
            )}
          </div>
          <p className="px-4 pb-4 text-center text-small text-white/80">{items[i]?.alt}</p>
        </div>
      )}
    </div>
  );
}
