"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { IconClose } from "../Icons";
import { useOverlay } from "../useOverlay";

export type Popup = {
  id: string; version: number; layout: "card" | "modal" | "bar"; title: string; body: string | null; cta: string | null;
  image_url: string | null; cta_url: string | null; pages: string[]; device: "all" | "mobile" | "desktop";
  delay_seconds: number; scroll_percent: number; frequency: "once" | "weekly" | "daily" | "session";
};

/** Which public page this is (pop-ups never show anywhere else: booking, sign-in, dashboards, legal pages). */
export function pageKey(path: string): string | null {
  if (path === "/") return "home";
  if (path === "/experiences") return "catalog";
  if (/^\/experiences\/[^/]+$/.test(path)) return "experience";
  if (path === "/explore") return "explore";
  if (path === "/plan") return "plan";
  if (path === "/wishlist") return "wishlist";
  return null;
}

const external = (url: string | null) => !!url && url.startsWith("https://");

/**
 * What a pop-up looks like (used on the site and as the live preview in the dashboard).
 *  card:  a small card in the bottom corner; the page stays usable (on phones: above the bottom edge)
 *  modal: centred over a dimmed page on computers; a bottom sheet on phones (never full screen)
 *  bar:   a slim strip along the bottom
 * Texts are plain text. External links are marked as an ad and open in a new tab.
 */
export function PromoView({ p, onClose, onClick, preview, raised, labels }: {
  p: Pick<Popup, "layout" | "title" | "body" | "cta" | "image_url" | "cta_url">;
  onClose?: () => void; onClick?: () => void; preview?: "mobile" | "desktop"; raised?: boolean;
  labels: { close: string; sponsored: string };
}) {
  const ad = external(p.cta_url);
  const titleId = "promo-title";
  const close = (
    <button type="button" onClick={onClose} aria-label={labels.close} title={labels.close}
      className="btn-press grid size-11 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-muted hover:text-ink">
      <IconClose size={20} />
    </button>
  );
  const ctaCls = "btn-press inline-flex min-h-11 items-center justify-center rounded-full bg-discovery px-5 font-bold text-white hover:bg-discovery-hover";
  const cta = p.cta && p.cta_url ? (
    ad
      ? <a href={p.cta_url} target="_blank" rel="noopener noreferrer nofollow sponsored" onClick={onClick} className={ctaCls}>{p.cta}</a>
      : preview ? <span className={ctaCls}>{p.cta}</span>
      : <Link prefetch={false} href={p.cta_url} onClick={onClick} className={ctaCls}>{p.cta}</Link>
  ) : null;
  const badge = ad ? <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-ink-muted">{labels.sponsored}</span> : null;
  // In the dashboard preview everything is positioned inside the preview frame instead of the window
  const pos = preview ? "absolute" : "fixed";
  const phone = preview === "mobile";
  const compact = phone ? "hidden" : "max-sm:hidden"; // the wide picture of a card is hidden on phones

  if (p.layout === "bar") {
    return (
      <div role="region" aria-labelledby={titleId}
        className={`promo-in ${pos} inset-x-0 z-[55] border-t border-line bg-surface/95 shadow-[0_-12px_30px_-18px_rgb(25_36_78/0.45)] backdrop-blur-md ${raised ? "bottom-[76px] md:bottom-0" : "bottom-0"}`}>
        <div className={`mx-auto flex max-w-7xl items-center gap-3 px-4 py-2 ${phone ? "flex-wrap" : "max-sm:flex-wrap"}`}>
          {p.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.image_url} alt="" className="size-10 shrink-0 rounded-[10px] object-cover" />
          )}
          <p className="min-w-0 flex-1 text-small"><b id={titleId} className="me-1.5">{p.title}</b>{p.body && <span className="text-ink-muted">{p.body}</span>} {badge}</p>
          {cta && <span className="[&>*]:min-h-10 [&>*]:px-4 [&>*]:text-small">{cta}</span>}
          {close}
        </div>
      </div>
    );
  }

  const box = (
    <div className={`promo-in relative overflow-hidden bg-surface shadow-[0_24px_60px_-20px_rgb(18_24_48/0.5)] ring-1 ring-line ${p.layout === "modal"
      ? phone ? "w-full rounded-t-[28px]" : "w-full rounded-t-[28px] sm:max-w-md sm:rounded-[28px]"
      : phone ? "w-full rounded-[22px]" : "w-full rounded-[22px] sm:w-[360px]"}`}>
      {p.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.image_url} alt="" className={`w-full object-cover ${p.layout === "modal" ? "aspect-[16/9]" : `aspect-[2/1] ${compact}`}`} />
      )}
      <div className={`absolute end-2 top-2 rounded-full ${p.image_url ? `bg-surface/90 backdrop-blur ${p.layout === "card" ? (phone ? "!bg-transparent" : "max-sm:bg-transparent") : ""}` : ""}`}>{close}</div>
      <div className={`flex flex-col gap-2 ${p.layout === "modal" ? "p-6" : "p-4"} ${p.image_url ? (p.layout === "card" ? (phone ? "pe-14" : "max-sm:pe-14") : "") : "pe-14"}`}>
        <div className="flex items-start gap-3">
          {/* phones: a small picture beside the text keeps the card low on the screen */}
          {p.image_url && p.layout === "card" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.image_url} alt="" className={`size-16 shrink-0 rounded-[14px] object-cover ${phone ? "" : "sm:hidden"}`} />
          )}
          <div className="flex min-w-0 flex-col gap-1.5">
            {badge && <span>{badge}</span>}
            <h2 id={titleId} className={p.layout === "modal" ? "text-h3 font-extrabold leading-snug" : "text-[17px] font-extrabold leading-snug"}>{p.title}</h2>
            {p.body && <p className={`whitespace-pre-line text-ink-muted ${p.layout === "card" ? "text-small" : ""}`}>{p.body}</p>}
          </div>
        </div>
        {cta && <div className="mt-2 flex [&>*]:w-full sm:[&>*]:w-auto">{cta}</div>}
      </div>
    </div>
  );

  if (p.layout === "modal") {
    return (
      <div role="dialog" aria-modal="true" aria-labelledby={titleId}
        className={`${pos} inset-0 z-[65] flex items-end justify-center ${phone ? "" : "sm:items-center sm:p-6"}`}>
        <button type="button" aria-label={labels.close} onClick={onClose} className="sheet-scrim absolute inset-0 bg-night/45" />
        {box}
      </div>
    );
  }
  return (
    <div role="dialog" aria-modal="false" aria-labelledby={titleId}
      className={`${pos} z-[55] ${phone ? "inset-x-3 bottom-3" : "inset-x-3 bottom-3 sm:inset-x-auto sm:end-5 sm:bottom-5"} ${raised ? "max-md:bottom-[84px]" : ""}`}>
      {box}
    </div>
  );
}

// ---- remembering what a visitor has already seen (this browser only; nothing is sent anywhere) ----
const SEEN_KEY = (id: string) => `wenro-popup:${id}`;
const SESSION_SHOWN = "wenro-popup-shown";
const DAY = 86_400_000;

function dismissedRecently(p: Popup) {
  try {
    if (p.frequency === "session") return sessionStorage.getItem(SEEN_KEY(p.id)) === String(p.version);
    const raw = localStorage.getItem(SEEN_KEY(p.id));
    if (!raw) return false;
    const { v, at } = JSON.parse(raw) as { v: number; at: number };
    if (v !== p.version) return false;
    if (p.frequency === "once") return true;
    return Date.now() - at < (p.frequency === "weekly" ? 7 : 1) * DAY;
  } catch { return false; }
}
function remember(p: Popup) {
  try {
    if (p.frequency === "session") sessionStorage.setItem(SEEN_KEY(p.id), String(p.version));
    else localStorage.setItem(SEEN_KEY(p.id), JSON.stringify({ v: p.version, at: Date.now() }));
  } catch { /* storage blocked: it may show again next visit */ }
}
function count(id: string, kind: "view" | "click" | "close") {
  const body = JSON.stringify({ id, kind });
  try {
    if (navigator.sendBeacon?.("/api/popups/event", new Blob([body], { type: "application/json" }))) return;
  } catch { /* fall back to fetch */ }
  fetch("/api/popups/event", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
}

/**
 * Shows at most ONE pop-up per visit (browser session), only on the public browsing pages, only after the
 * set delay and scrolling, never while another dialog is open or someone is typing, and not again once
 * closed (per its frequency). Loaded after the page is interactive, so it never slows the page down.
 */
export function PopupHost() {
  const path = usePathname();
  const locale = useLocale();
  const t = useTranslations("popup");
  const key = pageKey(path);
  const [list, setList] = useState<Popup[] | null>(null);
  const [shown, setShown] = useState<Popup | null>(null);
  const loadedFor = useRef<string | null>(null);

  // fetch once per language, only on pages that can show one
  useEffect(() => {
    if (!key || loadedFor.current === locale) return;
    try { if (sessionStorage.getItem(SESSION_SHOWN)) return; } catch { /* ignore */ }
    loadedFor.current = locale;
    const go = () => fetch(`/api/popups?locale=${locale}`).then((r) => r.json()).then((x) => setList(Array.isArray(x) ? x : [])).catch(() => setList([]));
    const w = window as unknown as { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(go, { timeout: 4000 }); else setTimeout(go, 1500);
  }, [key, locale]);

  // pick and schedule
  useEffect(() => {
    if (!key || !list?.length || shown) return;
    try { if (sessionStorage.getItem(SESSION_SHOWN)) return; } catch { /* ignore */ }
    const mobile = matchMedia("(max-width: 767px)").matches;
    const p = list.find((x) => x.pages.includes(key) && (x.device === "all" || (x.device === "mobile") === mobile) && !dismissedRecently(x));
    if (!p) return;
    let timeUp = false, scrolled = p.scroll_percent <= 0, done = false;
    const busy = () => !!document.querySelector('[aria-modal="true"]') || !!document.activeElement?.closest?.("input, textarea, select, [contenteditable]");
    const tryShow = () => {
      if (done || !timeUp || !scrolled) return;
      if (busy()) { window.setTimeout(tryShow, 2500); return; }
      done = true;
      try { sessionStorage.setItem(SESSION_SHOWN, p.id); } catch { /* ignore */ }
      setShown(p);
      count(p.id, "view");
    };
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - innerHeight;
      if (h <= 0 || (scrollY / h) * 100 >= p.scroll_percent) { scrolled = true; tryShow(); }
    };
    const timer = window.setTimeout(() => { timeUp = true; tryShow(); }, Math.max(0, p.delay_seconds) * 1000);
    if (!scrolled) { addEventListener("scroll", onScroll, { passive: true }); onScroll(); }
    return () => { done = true; clearTimeout(timer); removeEventListener("scroll", onScroll); };
  }, [key, list, shown]);

  // leaving the page type that it was meant for hides it
  useEffect(() => { if (shown && (!key || !shown.pages.includes(key))) setShown(null); }, [key, shown]);

  const close = () => { if (!shown) return; remember(shown); count(shown.id, "close"); setShown(null); };
  const click = () => { if (!shown) return; remember(shown); count(shown.id, "click"); setShown(null); };
  // Escape for every layout; Back gesture and locked page only for the centred one
  useOverlay(!!shown, close, { lockScroll: shown?.layout === "modal", history: shown?.layout === "modal" });

  if (!shown) return null;
  return <PromoView p={shown} onClose={close} onClick={click} raised={key === "experience"} labels={{ close: t("close"), sponsored: t("sponsored") }} />;
}
