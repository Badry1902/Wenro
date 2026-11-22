"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Link } from "@/i18n/navigation";
import { PromoView } from "../site/Promo";

const LOCALES = ["ar", "en", "de", "ru", "fr"] as const;
const PAGES = ["home", "catalog", "experience", "explore", "plan", "wishlist"] as const;
type Loc = (typeof LOCALES)[number];
type Layout = "card" | "modal" | "bar";
type Text = { title?: string; body?: string; cta?: string };

export type EditorValues = {
  id: string | null; name: string; layout: Layout; content: Partial<Record<Loc, Text>>; image_url: string | null; cta_url: string;
  pages: string[]; locales: string[] | null; device: "all" | "mobile" | "desktop"; delay_seconds: number; scroll_percent: number;
  frequency: "once" | "weekly" | "daily" | "session"; starts_at: string; ends_at: string; priority: number; status: string;
};

type Labels = {
  sections: Record<"content" | "look" | "where" | "when" | "schedule" | "preview", string>;
  name: string; nameHint: string; contentHint: string; lang: Record<Loc, string>; fTitle: string; fBody: string; fCta: string;
  link: string; linkHint: string; image: string; imageHint: string; removeImage: string;
  layout: Record<Layout, string>; layoutHint: Record<Layout, string>; pages: string; page: Record<(typeof PAGES)[number], string>;
  languages: string; allLanguages: string; device: string; deviceOpt: Record<"all" | "mobile" | "desktop", string>;
  delay: string; scroll: string; scrollVal: string; scrollNone: string; frequency: string; freq: Record<EditorValues["frequency"], string>;
  startsAt: string; endsAt: string; scheduleHint: string; priority: string; priorityHint: string; showAgain: string;
  saveDraft: string; savePublish: string; save: string; cancel: string;
  previewMobile: string; previewDesktop: string; previewLang: string; previewEmpty: string; close: string; sponsored: string;
};

const field = "min-h-11 w-full rounded-control border border-field bg-surface px-3";
const label = "flex flex-col gap-1.5 text-small font-bold";
const hint = "text-[12px] font-normal text-ink-muted";

function Buttons({ labels, isNew, active }: { labels: Labels; isNew: boolean; active: boolean }) {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button name="publish" value={active ? "1" : ""} disabled={pending}
        className="btn-press inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-surface px-4 font-semibold hover:border-ink-muted disabled:opacity-60">
        {pending && <span className="spinner" aria-hidden="true" />}{active ? labels.save : labels.saveDraft}
      </button>
      {!active && (
        <button name="publish" value="1" disabled={pending}
          className="btn-press inline-flex min-h-11 items-center gap-2 rounded-control bg-discovery px-4 font-semibold text-white hover:bg-discovery-hover disabled:opacity-60">
          {labels.savePublish}
        </button>
      )}
      <Link href="/app/admin/popups" className="min-h-11 content-center px-2 text-small font-semibold text-ink-muted hover:underline">{labels.cancel}</Link>
      {isNew && <span className="sr-only">new</span>}
    </div>
  );
}

/** Small drawings of the three layouts, so the choice is visual. */
function LayoutSketch({ layout }: { layout: Layout }) {
  return (
    <span className="relative block h-16 w-full overflow-hidden rounded-[10px] border border-line bg-muted" aria-hidden="true">
      <span className="absolute inset-x-2 top-2 h-1.5 rounded bg-faint" /><span className="absolute inset-x-2 top-5 h-1.5 w-2/3 rounded bg-faint" />
      {layout === "card" && <span className="absolute bottom-1.5 end-1.5 h-7 w-12 rounded-[6px] bg-discovery" />}
      {layout === "modal" && <><span className="absolute inset-0 bg-night/30" /><span className="absolute left-1/2 top-1/2 h-9 w-16 -translate-x-1/2 -translate-y-1/2 rounded-[6px] bg-discovery" /></>}
      {layout === "bar" && <span className="absolute inset-x-0 bottom-0 h-3 bg-discovery" />}
    </span>
  );
}

export function PopupEditor({ initial, labels, locale, action }: { initial: EditorValues; labels: Labels; locale: string; action: (f: FormData) => Promise<void> }) {
  const [v, setV] = useState(initial);
  const [tab, setTab] = useState<Loc>((LOCALES as readonly string[]).includes(locale) ? (locale as Loc) : "ar");
  const [img, setImg] = useState<string | null>(initial.image_url);
  const [removeImg, setRemoveImg] = useState(false);
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");
  const [allLangs, setAllLangs] = useState(!initial.locales);
  const set = <K extends keyof EditorValues>(k: K, val: EditorValues[K]) => setV((x) => ({ ...x, [k]: val }));
  const setText = (l: Loc, k: keyof Text, val: string) => setV((x) => ({ ...x, content: { ...x.content, [l]: { ...x.content[l], [k]: val } } }));

  // preview text: the tab being edited, falling back like the site does (English, then Arabic)
  const pick = (l: Loc) => (v.content[l]?.title ? v.content[l] : v.content.en?.title ? v.content.en : v.content.ar?.title ? v.content.ar : Object.values(v.content).find((c) => c?.title)) ?? {};
  const shown = pick(tab);
  const active = initial.status === "active";

  return (
    <form action={action} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <input type="hidden" name="locale" value={locale} />
      {v.id && <input type="hidden" name="id" value={v.id} />}

      <div className="flex min-w-0 flex-col gap-6">
        {/* Content */}
        <section className="rounded-card border border-line bg-surface p-5">
          <h2 className="mb-4 text-[18px] font-semibold">{labels.sections.content}</h2>
          <label className={`${label} mb-4`}>{labels.name}
            <input name="name" value={v.name} onChange={(e) => set("name", e.target.value)} maxLength={80} className={field} />
            <span className={hint}>{labels.nameHint}</span>
          </label>
          <div role="tablist" className="mb-3 flex flex-wrap gap-1.5">
            {LOCALES.map((l) => (
              <button key={l} type="button" role="tab" aria-selected={tab === l} onClick={() => setTab(l)}
                className={`tab-chip inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-small font-bold ${tab === l ? "border-ink bg-ink text-surface" : "border-line hover:border-ink"}`}>
                {labels.lang[l]}{v.content[l]?.title ? <span className={`size-1.5 rounded-full ${tab === l ? "bg-surface" : "bg-success"}`} aria-hidden="true" /> : null}
              </button>
            ))}
          </div>
          <p className={`${hint} mb-3`}>{labels.contentHint}</p>
          {LOCALES.map((l) => (
            <div key={l} hidden={tab !== l} dir={l === "ar" ? "rtl" : "ltr"} className="flex flex-col gap-3">
              <label className={label}>
                <span className="flex justify-between">{labels.fTitle}<span className={hint}>{(v.content[l]?.title ?? "").length}/80</span></span>
                <input name={`title_${l}`} value={v.content[l]?.title ?? ""} onChange={(e) => setText(l, "title", e.target.value)} maxLength={80} className={field} />
              </label>
              <label className={label}>
                <span className="flex justify-between">{labels.fBody}<span className={hint}>{(v.content[l]?.body ?? "").length}/280</span></span>
                <textarea name={`body_${l}`} value={v.content[l]?.body ?? ""} onChange={(e) => setText(l, "body", e.target.value)} maxLength={280} rows={3} className={`${field} py-2`} />
              </label>
              <label className={label}>
                <span className="flex justify-between">{labels.fCta}<span className={hint}>{(v.content[l]?.cta ?? "").length}/30</span></span>
                <input name={`cta_${l}`} value={v.content[l]?.cta ?? ""} onChange={(e) => setText(l, "cta", e.target.value)} maxLength={30} className={field} />
              </label>
            </div>
          ))}
          <label className={`${label} mt-4`}>{labels.link}
            <input name="cta_url" value={v.cta_url} onChange={(e) => set("cta_url", e.target.value)} maxLength={500} dir="ltr" placeholder="/experiences?cat=sea" className={field} />
            <span className={hint}>{labels.linkHint}</span>
          </label>
          <div className="mt-4 flex flex-wrap items-end gap-4">
            {img && !removeImg && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img} alt="" className="h-20 w-40 rounded-[12px] object-cover" />
            )}
            <label className={label}>{labels.image}
              <input type="file" name="image" accept="image/jpeg,image/png,image/webp"
                className="text-small file:me-3 file:min-h-11 file:rounded-control file:border file:border-line file:bg-surface file:px-3 file:font-semibold file:text-ink"
                onChange={(e) => { const f = e.target.files?.[0]; setRemoveImg(false); setImg(f ? URL.createObjectURL(f) : initial.image_url); }} />
              <span className={hint}>{labels.imageHint}</span>
            </label>
            {initial.image_url && (
              <label className="flex min-h-11 items-center gap-2 text-small font-semibold">
                <input type="checkbox" name="remove_image" checked={removeImg} onChange={(e) => setRemoveImg(e.target.checked)} className="size-5 accent-[var(--color-discovery)]" />{labels.removeImage}
              </label>
            )}
          </div>
        </section>

        {/* Look */}
        <section className="rounded-card border border-line bg-surface p-5">
          <h2 className="mb-4 text-[18px] font-semibold">{labels.sections.look}</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {(["card", "modal", "bar"] as const).map((l) => (
              <label key={l} className={`flex cursor-pointer flex-col gap-2 rounded-card border-2 p-3 transition-colors ${v.layout === l ? "border-discovery bg-discovery-tint" : "border-line hover:border-ink-muted"}`}>
                <input type="radio" name="layout" value={l} checked={v.layout === l} onChange={() => set("layout", l)} className="sr-only" />
                <LayoutSketch layout={l} />
                <b className="text-small">{labels.layout[l]}</b>
                <span className={hint}>{labels.layoutHint[l]}</span>
              </label>
            ))}
          </div>
        </section>

        {/* Where and for whom */}
        <section className="rounded-card border border-line bg-surface p-5">
          <h2 className="mb-4 text-[18px] font-semibold">{labels.sections.where}</h2>
          <fieldset className="mb-4">
            <legend className="mb-2 text-small font-bold">{labels.pages}</legend>
            <div className="flex flex-wrap gap-2">
              {PAGES.map((p) => (
                <label key={p} className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-small font-semibold ${v.pages.includes(p) ? "border-discovery bg-discovery-tint text-link" : "border-line"}`}>
                  <input type="checkbox" name={`page_${p}`} checked={v.pages.includes(p)} className="sr-only"
                    onChange={(e) => set("pages", e.target.checked ? [...v.pages, p] : v.pages.filter((x) => x !== p))} />
                  {labels.page[p]}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="mb-4">
            <legend className="mb-2 text-small font-bold">{labels.languages}</legend>
            <label className="mb-2 flex min-h-10 items-center gap-2 text-small font-semibold">
              <input type="checkbox" name="all_langs" checked={allLangs} onChange={(e) => setAllLangs(e.target.checked)} className="size-5 accent-[var(--color-discovery)]" />{labels.allLanguages}
            </label>
            {!allLangs && (
              <div className="flex flex-wrap gap-2">
                {LOCALES.map((l) => (
                  <label key={l} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line px-3.5 text-small font-semibold">
                    <input type="checkbox" name={`lang_${l}`} defaultChecked={!initial.locales || initial.locales.includes(l)} className="size-4 accent-[var(--color-discovery)]" />{labels.lang[l]}
                  </label>
                ))}
              </div>
            )}
          </fieldset>
          <label className={`${label} max-w-xs`}>{labels.device}
            <select name="device" value={v.device} onChange={(e) => set("device", e.target.value as EditorValues["device"])} className={field}>
              {(["all", "mobile", "desktop"] as const).map((d) => <option key={d} value={d}>{labels.deviceOpt[d]}</option>)}
            </select>
          </label>
        </section>

        {/* When */}
        <section className="rounded-card border border-line bg-surface p-5">
          <h2 className="mb-4 text-[18px] font-semibold">{labels.sections.when}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={label}>{labels.delay}
              <input type="number" name="delay_seconds" min={0} max={120} value={v.delay_seconds} onChange={(e) => set("delay_seconds", Number(e.target.value))} className={field} />
            </label>
            <label className={label}>{labels.frequency}
              <select name="frequency" value={v.frequency} onChange={(e) => set("frequency", e.target.value as EditorValues["frequency"])} className={field}>
                {(["once", "weekly", "daily", "session"] as const).map((f) => <option key={f} value={f}>{labels.freq[f]}</option>)}
              </select>
            </label>
            <label className={`${label} sm:col-span-2`}>
              <span className="flex justify-between">{labels.scroll}<span className="font-normal text-ink-muted">{v.scroll_percent > 0 ? labels.scrollVal.replace("{n}", String(v.scroll_percent)) : labels.scrollNone}</span></span>
              <input type="range" name="scroll_percent" min={0} max={90} step={5} value={v.scroll_percent} onChange={(e) => set("scroll_percent", Number(e.target.value))} className="brand-range" />
            </label>
          </div>
        </section>

        {/* Dates and priority */}
        <section className="rounded-card border border-line bg-surface p-5">
          <h2 className="mb-4 text-[18px] font-semibold">{labels.sections.schedule}</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className={label}>{labels.startsAt}
              <input type="datetime-local" name="starts_at" value={v.starts_at} onChange={(e) => set("starts_at", e.target.value)} className={field} />
            </label>
            <label className={label}>{labels.endsAt}
              <input type="datetime-local" name="ends_at" value={v.ends_at} min={v.starts_at || undefined} onChange={(e) => set("ends_at", e.target.value)} className={field} />
            </label>
            <label className={label}>{labels.priority}
              <input type="number" name="priority" min={-100} max={100} value={v.priority} onChange={(e) => set("priority", Number(e.target.value))} className={field} />
            </label>
          </div>
          <p className={`${hint} mt-2`}>{labels.scheduleHint} {labels.priorityHint}</p>
          {v.id && (
            <label className="mt-4 flex min-h-11 items-center gap-2 text-small font-semibold">
              <input type="checkbox" name="show_again" className="size-5 accent-[var(--color-discovery)]" />{labels.showAgain}
            </label>
          )}
        </section>

        <Buttons labels={labels} isNew={!v.id} active={active} />
      </div>

      {/* Live preview */}
      <aside className="xl:sticky xl:top-6 xl:self-start">
        <div className="rounded-card border border-line bg-surface p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-[18px] font-semibold">{labels.sections.preview}</h2>
            <div className="flex rounded-full bg-muted p-1">
              {(["mobile", "desktop"] as const).map((d) => (
                <button key={d} type="button" onClick={() => setDevice(d)} aria-pressed={device === d}
                  className={`min-h-9 rounded-full px-3 text-small font-bold ${device === d ? "bg-surface shadow-sm" : "text-ink-muted"}`}>
                  {d === "mobile" ? labels.previewMobile : labels.previewDesktop}
                </button>
              ))}
            </div>
          </div>
          <div className={`relative mx-auto overflow-hidden rounded-[22px] border-4 border-night bg-ivory ${device === "mobile" ? "h-[560px] w-[300px]" : "h-[300px] w-full"}`}
            dir={tab === "ar" ? "rtl" : "ltr"} aria-label={labels.sections.preview}>
            {/* a sketch of a page behind the pop-up */}
            <div className="flex flex-col gap-2 p-3" aria-hidden="true">
              <div className="h-6 w-20 rounded bg-faint" />
              <div className="h-24 rounded-[12px] bg-faint/70" />
              <div className="grid grid-cols-2 gap-2"><div className="h-20 rounded-[10px] bg-faint/60" /><div className="h-20 rounded-[10px] bg-faint/60" /></div>
              <div className="h-3 w-3/4 rounded bg-faint/60" /><div className="h-3 w-1/2 rounded bg-faint/60" />
            </div>
            {shown.title ? (
              <PromoView preview={device} labels={{ close: labels.close, sponsored: labels.sponsored }}
                p={{ layout: v.layout, title: shown.title ?? "", body: shown.body ?? null, cta: shown.cta ?? null, image_url: removeImg ? null : img, cta_url: v.cta_url || null }} />
            ) : (
              <p className="absolute inset-x-4 bottom-4 rounded-card bg-surface p-3 text-center text-small text-ink-muted">{labels.previewEmpty}</p>
            )}
          </div>
        </div>
      </aside>
    </form>
  );
}
