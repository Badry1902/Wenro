"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

const KEY = "wenro-theme";

/**
 * Runs before the first paint (inline in <head>) so a dark-mode visitor never sees a white flash.
 * Light is the default; dark only when the visitor chose it on this browser.
 */
export const THEME_INIT = `try{var t=localStorage.getItem("${KEY}");if(t==="dark")document.documentElement.dataset.theme="dark";addEventListener("storage",function(e){if(e.key==="${KEY}"){if(e.newValue==="dark")document.documentElement.dataset.theme="dark";else delete document.documentElement.dataset.theme}})}catch(e){}`;

function apply(dark: boolean) {
  const el = document.documentElement;
  el.classList.add("theme-fade");
  if (dark) el.dataset.theme = "dark"; else delete el.dataset.theme;
  try { localStorage.setItem(KEY, dark ? "dark" : "light"); } catch { /* private mode: the choice lasts for this page only */ }
  window.setTimeout(() => el.classList.remove("theme-fade"), 320);
}

/** Light/dark switch. The icon follows the theme through CSS, so the server HTML is the same for everyone. */
export function ThemeToggle({ variant = "icon", tone = "light", className = "" }: { variant?: "icon" | "row"; tone?: "light" | "dark"; className?: string }) {
  const t = useTranslations("common");
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const read = () => setDark(document.documentElement.dataset.theme === "dark");
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  const flip = () => { apply(!dark); setDark(!dark); };
  const label = dark ? t("themeLight") : t("themeDark");

  const icons = (
    <>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="dark:hidden">
        <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z" />
      </svg>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true" className="hidden dark:block">
        <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    </>
  );

  if (variant === "row") {
    return (
      <button type="button" role="switch" aria-checked={dark} onClick={flip}
        className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-control px-3 font-bold hover:bg-discovery-tint ${className}`}>
        <span className="flex items-center gap-3">{icons}{t("themeDark")}</span>
        <span aria-hidden="true" className={`relative h-6 w-11 rounded-full transition-colors ${dark ? "bg-discovery" : "bg-faint"}`}>
          <span className={`absolute top-0.5 size-5 rounded-full bg-paper shadow transition-[inset-inline-start] duration-200 ${dark ? "start-[22px]" : "start-0.5"}`} />
        </span>
      </button>
    );
  }
  return (
    <button type="button" onClick={flip} aria-label={label} title={label} aria-pressed={dark}
      className={`btn-press grid size-11 shrink-0 place-items-center rounded-full ${tone === "dark" ? "text-white/90 hover:bg-white/10" : "text-ink hover:bg-discovery-tint"} ${className}`}>
      {icons}
    </button>
  );
}
