"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { mediaSrc } from "@/lib/media";
import { IconSearch } from "../Icons";

type Labels = { eyebrow: string; title: string; subtitle: string; searchLabel: string; placeholder: string; category: string; all: string; button: string };

/**
 * Home hero: full-width photos that slowly zoom and cross-fade, with the search box on top.
 * The search is a plain GET form, so it works before scripts load.
 */
export function Hero({ photos, categories, labels }: { photos: { src: string; alt: string }[]; categories: { slug: string; name: string }[]; labels: Labels }) {
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
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(18_24_48/0.55)_0%,rgb(18_24_48/0.25)_45%,rgb(18_24_48/0.75)_100%)]" />
      </div>

      <div className="mx-auto flex min-h-[560px] max-w-7xl flex-col justify-end px-4 pb-10 pt-24 md:min-h-[620px] md:pb-16">
        <div className="hero-in max-w-3xl text-white">
          <p className="text-small font-bold uppercase tracking-[0.22em] text-apricot">{labels.eyebrow}</p>
          <h1 className="mt-3 font-display text-[40px] leading-[1.05] md:text-[64px] rtl:font-sans rtl:font-extrabold rtl:leading-tight">{labels.title}</h1>
          <p className="mt-4 max-w-xl text-[17px] text-white/85 md:text-h3">{labels.subtitle}</p>
        </div>

        <form action={`/${locale}/experiences`} method="get" role="search"
          className="hero-in mt-8 grid gap-2 rounded-[20px] bg-white p-2 shadow-[0_30px_60px_-25px_rgb(0_0_0/0.6)] [animation-delay:120ms] md:grid-cols-[1fr_240px_auto] md:rounded-full">
          <label className="flex min-h-14 items-center gap-3 rounded-full px-4 focus-within:bg-discovery-tint">
            <IconSearch size={22} className="shrink-0 text-discovery" />
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
          <button type="submit" className="btn-press inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-discovery px-8 text-[16px] font-bold text-white hover:bg-discovery-hover">
            <IconSearch size={20} />{labels.button}
          </button>
        </form>
      </div>
    </section>
  );
}
