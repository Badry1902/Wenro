"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { mediaSrc } from "@/lib/media";
import { IconSearch } from "../Icons";

type Labels = { title: string; subtitle: string; searchLabel: string; placeholder: string; category: string; all: string; button: string };
/** Visitors arriving from an ad or partner link (?ref=…) see the campaign headline instead. */
type Campaign = { title: string; subtitle: string; button: string };

/**
 * Home hero: full-width photos that slowly zoom and cross-fade, with the search box on top.
 * The search is a plain GET form, so it works before scripts load.
 */
export function Hero({ photos, categories, labels, campaign }: { photos: { src: string; alt: string }[]; categories: { slug: string; name: string }[]; labels: Labels; campaign?: Campaign }) {
  const locale = useLocale();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (photos.length < 2 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => { if (!document.hidden) setI((n) => (n + 1) % photos.length); }, 6500);
    return () => clearInterval(id);
  }, [photos.length]);

  return (
    <section className="relative isolate overflow-hidden bg-ink">
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        {photos.map((p, k) => (
          <div key={p.src} className={`hero-slide absolute inset-0 ${k === i ? "is-on" : ""}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {(k === i || k === (i + 1) % photos.length) && <img src={mediaSrc(p.src, { w: 2000, h: 1100 })} alt="" className="h-full w-full object-cover" loading={k === 0 ? "eager" : "lazy"} fetchPriority={k === 0 ? "high" : "auto"} />}
          </div>
        ))}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(25_36_78/0.6)_0%,rgb(25_36_78/0.2)_42%,rgb(25_36_78/0.82)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_100%_0%,rgb(37_60_150/0.45),transparent_70%)]" />
      </div>

      <div className="mx-auto flex min-h-[580px] max-w-7xl flex-col justify-end px-4 pb-16 pt-24 md:min-h-[640px] md:pb-24">
        <div className="hero-in max-w-3xl text-white">
          <div className={campaign ? "campaign-hide" : undefined}>
            <h1 className="font-display text-[42px] font-black leading-[1.02] text-balance md:text-[68px] rtl:leading-[1.3]">{labels.title}</h1>
            <p className="mt-4 max-w-xl text-[17px] text-white/85 md:text-h3">{labels.subtitle}</p>
          </div>
          {campaign && (
            <div className="campaign-only">
              <h1 className="font-display text-[42px] font-black leading-[1.02] text-balance md:text-[64px]">{campaign.title}</h1>
              <p className="mt-4 max-w-xl text-[17px] text-white/85 md:text-h3">{campaign.subtitle}</p>
            </div>
          )}
        </div>

        <form action={`/${locale}/experiences`} method="get" role="search"
          className="hero-in mt-8 grid gap-2 rounded-[24px] bg-white p-2 shadow-[0_30px_60px_-25px_rgb(0_0_0/0.6)] ring-4 ring-white/15 [animation-delay:120ms] md:grid-cols-[1fr_240px_auto] md:rounded-full">
          <label className="flex min-h-14 items-center gap-3 rounded-full px-4 focus-within:bg-discovery-tint">
            <IconSearch size={22} className="shrink-0 text-apricot" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">{labels.searchLabel}</span>
              <input name="q" type="search" placeholder={labels.placeholder} className="w-full bg-transparent text-[16px] font-semibold text-ink outline-none placeholder:font-normal placeholder:text-ink-muted" />
            </span>
          </label>
          <label className="flex min-h-14 items-center gap-3 rounded-full px-4 focus-within:bg-discovery-tint md:border-s md:border-line">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">{labels.category}</span>
              <select name="cat" defaultValue="" className="w-full bg-transparent text-[16px] font-semibold text-ink outline-none">
                <option value="">{labels.all}</option>
                {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </span>
          </label>
          <button type="submit" className="btn-press inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-apricot px-8 text-[16px] font-extrabold text-ink hover:bg-apricot-hover">
            <IconSearch size={20} />
            {campaign ? <><span className="campaign-hide">{labels.button}</span><span className="campaign-only">{campaign.button}</span></> : labels.button}
          </button>
        </form>
      </div>
      {/* Wave edge into the page */}
      <svg className="absolute inset-x-0 bottom-[-1px] h-6 w-full text-surface md:h-10" viewBox="0 0 1440 40" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 22c120-16 240-16 360 0s240 16 360 0 240-16 360 0 240 16 360 0v18H0z" fill="currentColor" />
      </svg>
    </section>
  );
}
