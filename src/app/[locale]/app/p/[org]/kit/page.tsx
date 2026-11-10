import QRCode from "qrcode";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { rpc } from "@/lib/data/rpc";
import type { ExperienceCard } from "@/lib/data/types";
import { requireWorkspace } from "@/lib/workspaces";
import { siteUrl } from "@/lib/env";
import { formatMoney } from "@/lib/money";
import { mediaSrc } from "@/lib/media";
import { cardImages } from "@/lib/catalog";
import { Empty, PageTitle } from "@/components/ui";
import { CopyButton } from "@/components/CopyButton";
import { StoryMaker } from "@/components/growth/StoryMaker";
import { themeFor } from "@/lib/themes";

export const dynamic = "force-dynamic";
const LANGS = ["ar", "en", "de", "ru", "fr"] as const;
type Summary = { codes: { code: string; active: boolean }[] };

/** Content kit: for every trip, a ready caption in five languages and a story image with the partner's QR. */
export default async function Kit({ params, searchParams }: { params: Promise<{ locale: string; org: string }>; searchParams: Promise<{ l?: string }> }) {
  const { locale, org } = await params;
  setRequestLocale(locale);
  await requireWorkspace(locale, org, ["marketer", "agency"]);
  const q = await searchParams;
  const lang = (LANGS as readonly string[]).includes(q.l ?? "") ? (q.l as (typeof LANGS)[number]) : (locale as (typeof LANGS)[number]);
  const t = await getTranslations("app.kit");
  const tc = await getTranslations({ locale: lang, namespace: "app.kit" });
  const tl = await getTranslations("languages");
  const [s, cards] = await Promise.all([
    rpc<Summary>("partner_summary", { p_partner: org }, "user"),
    rpc<ExperienceCard[]>("experience_list", { p_locale: lang }, "anon").catch(() => [] as ExperienceCard[]),
  ]);
  const code = s.codes.find((c) => c.active)?.code;
  if (!code) return (<><PageTitle title={t("title")} sub={t("sub")} /><Empty>{t("noCode")}</Empty></>);
  const items = await Promise.all(cards.map(async (c) => {
    const link = `${siteUrl()}/${lang}/experiences/${c.slug}?ref=${code}`;
    const price = c.from_minor != null ? formatMoney({ minor: c.from_minor, currency: c.currency }, lang) : "";
    const caption = tc("caption", { title: c.title ?? "", summary: c.summary ?? "", price, link, code });
    const qr = await QRCode.toString(link, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#19244E", light: "#FFFFFF" } });
    return { c, link, price, caption, qr, img: cardImages(c)[0] ?? null };
  }));

  return (
    <>
      <PageTitle title={t("title")} sub={t("sub")} />
      <nav className="mb-5 flex flex-wrap gap-2" aria-label={t("language")}>
        {LANGS.map((l) => (
          <a key={l} href={`?l=${l}`} aria-current={l === lang ? "true" : undefined}
            className={`btn-press inline-flex min-h-10 items-center rounded-full border px-4 text-small font-bold ${l === lang ? "border-discovery bg-discovery text-white" : "border-line hover:border-discovery"}`}>{tl(l)}</a>
        ))}
      </nav>
      <ul className="grid gap-4 xl:grid-cols-2">
        {items.map(({ c, link, price, caption, qr, img }) => (
          <li key={c.id} className="flex flex-col gap-3 rounded-card border border-line p-4">
            <div className="flex gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {img && <img src={mediaSrc(img, { w: 160, h: 160 })} alt="" className="size-20 shrink-0 rounded-[12px] object-cover" loading="lazy" />}
              <div className="min-w-0"><b className="line-clamp-2">{c.title}</b><span className="text-small text-ink-muted">{price}</span></div>
            </div>
            <p dir={lang === "ar" ? "rtl" : "ltr"} className="whitespace-pre-line rounded-control bg-[#F3F4F8] p-3 text-small">{caption}</p>
            <div className="flex flex-wrap items-start gap-2">
              <CopyButton text={caption} label={t("copyCaption")} done={t("copied")} />
              <CopyButton text={link} label={t("copyLink")} done={t("copied")} />
              <a href={`https://wa.me/?text=${encodeURIComponent(caption)}`} target="_blank" rel="noopener noreferrer"
                className="btn-press inline-flex min-h-11 items-center rounded-control bg-[#1F7A4D] px-3 text-small font-bold text-white">WhatsApp</a>
            </div>
            <StoryMaker photo={img ? mediaSrc(img, { w: 1080, h: 1920 }) : null} theme={themeFor(c)} title={c.title ?? ""} price={price ? tc("from", { price }) : ""} qrSvg={qr} code={code}
              cta={tc("storyCta")} rtl={lang === "ar"} fileName={`wenro-${c.slug}-${code}`}
              labels={{ make: t("makeStory"), making: t("making"), download: t("download"), share: t("share") }} />
          </li>
        ))}
      </ul>
    </>
  );
}
