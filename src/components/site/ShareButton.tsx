"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

/** Share this trip: the phone's own share sheet when available, otherwise copy the link. */
export function ShareButton({ title }: { title: string }) {
  const t = useTranslations("share");
  const [done, setDone] = useState(false);
  const share = async () => {
    const url = location.href.split("?")[0];
    try {
      if (navigator.share) { await navigator.share({ title, url }); return; }
      await navigator.clipboard.writeText(url);
      setDone(true); setTimeout(() => setDone(false), 2000);
    } catch { /* closed the share sheet */ }
  };
  return (
    <button type="button" onClick={share} aria-label={t("label")} title={t("label")}
      className="btn-press inline-flex h-10 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-small font-bold hover:border-discovery hover:text-discovery">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 15V3M7 8l5-5 5 5M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6" /></svg>
      <span aria-live="polite" className="hidden sm:inline">{done ? t("copied") : t("label")}</span>
    </button>
  );
}
