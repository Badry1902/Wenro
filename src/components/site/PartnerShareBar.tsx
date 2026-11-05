"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSignedIn } from "./useSignedIn";
import { CopyButton } from "../CopyButton";
import { QrDownload } from "../ShareKit";
import { IconClose } from "../Icons";

type Partner = { org: string; name: string; type: "marketer" | "agency"; code: string; link: string; qr: string };

/**
 * Shown only to signed-in marketers and agencies on a trip page: "Get my link" opens their own tracked link
 * and QR for this trip (copy, WhatsApp, download). Everyone else sees nothing.
 */
export function PartnerShareBar({ slug, title }: { slug: string; title: string }) {
  const t = useTranslations("partnerShare");
  const locale = useLocale();
  const signedIn = useSignedIn();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState(0);

  useEffect(() => {
    if (!signedIn) return;
    let live = true;
    fetch(`/api/partner-share?slug=${encodeURIComponent(slug)}&locale=${locale}`, { cache: "no-store" })
      .then((r) => r.json()).then((j) => { if (live) setPartners(j.partners ?? []); }).catch(() => {});
    return () => { live = false; };
  }, [signedIn, slug, locale]);

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [open]);

  if (!partners.length) return null;
  const p = partners[Math.min(pick, partners.length - 1)];
  const wa = `https://wa.me/?text=${encodeURIComponent(`${title}\n${p.link}`)}`;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="btn-press fixed bottom-24 end-4 z-30 inline-flex min-h-12 items-center gap-2 rounded-full bg-apricot px-5 font-bold text-ink shadow-lg hover:brightness-95 md:bottom-6 print:hidden">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" /></svg>
        {t("button")}
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/50 p-0 md:items-center md:p-4" role="dialog" aria-modal="true" aria-label={t("title")} onClick={() => setOpen(false)}>
          <div className="pop-in w-full max-w-md rounded-t-[24px] bg-surface p-5 md:rounded-card" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div><h2 className="text-h3 font-bold">{t("title")}</h2><p className="text-small text-ink-muted">{t("sub")}</p></div>
              <button type="button" onClick={() => setOpen(false)} aria-label={t("close")} autoFocus className="btn-press grid size-11 shrink-0 place-items-center rounded-full hover:bg-discovery-tint"><IconClose /></button>
            </div>
            {partners.length > 1 && (
              <label className="mb-3 flex flex-col gap-1 text-small font-bold">{t("as")}
                <select value={pick} onChange={(e) => setPick(Number(e.target.value))} className="min-h-11 rounded-control border border-[#8A90A6] bg-white px-3 font-normal">
                  {partners.map((x, i) => <option key={x.org} value={i}>{x.name}</option>)}
                </select>
              </label>
            )}
            <div className="flex flex-col items-center gap-3">
              <div role="img" aria-label={t("qr")} className="size-48 rounded-card border border-line bg-white p-2 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: p.qr }} />
              <QrDownload svg={p.qr} name={`wenro-${slug}-${p.code}`} labels={{ png: t("png"), svg: t("svg") }} />
            </div>
            <p className="mt-4 break-all rounded-control bg-[#F3F4F8] p-3 text-small" dir="ltr">{p.link}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <CopyButton text={p.link} label={t("copy")} done={t("copied")} />
              <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-press inline-flex min-h-11 items-center justify-center rounded-control bg-[#1F7A4D] px-3 text-small font-bold text-white">{t("whatsapp")}</a>
            </div>
            <p className="mt-3 text-[12px] text-ink-muted">{t("note", { code: p.code })}</p>
          </div>
        </div>
      )}
    </>
  );
}
