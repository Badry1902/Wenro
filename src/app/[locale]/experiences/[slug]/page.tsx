import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { rpc } from "@/lib/data/rpc";
import { formatMoney } from "@/lib/money";
import type { ExperiencePage } from "@/lib/data/types";
import { SiteHeader } from "@/components/SiteHeader";
import { FoldGallery } from "@/components/FoldGallery";
import { BookingWidget } from "@/components/BookingWidget";
import { IconCar, IconCheck, IconClock, IconClose, IconSea } from "@/components/Icons";

export const dynamic = "force-dynamic"; // seats and prices change; always read fresh

type Params = { params: Promise<{ locale: string; slug: string }> };
type Search = { searchParams: Promise<{ ref?: string; ag?: string }> };
const REF = /^[A-Za-z0-9]{4,20}$/;
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function load(slug: string, locale: string) {
  return rpc<ExperiencePage | null>("experience_page", { p_slug: slug, p_locale: locale }, "anon");
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, slug } = await params;
  const page = await load(slug, locale);
  return page ? { title: `${page.title} · WENRO`, description: page.summary ?? undefined } : {};
}

const lines = (text: string | null) => (text ?? "").split("\n").map((l) => l.trim()).filter(Boolean);

export default async function ExperiencePageView({ params, searchParams }: Params & Search) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const q = await searchParams;
  const page = await load(slug, locale);
  if (!page) notFound();
  // Count a partner-link visit (no personal data). Never blocks or breaks the page.
  if (q.ref && REF.test(q.ref)) await rpc("record_click", { p_code: q.ref, p_experience: page.id }, "service").catch(() => undefined);
  const agency = q.ag && GUID.test(q.ag) ? q.ag : undefined; // checked again on the booking page and in the database
  const t = await getTranslations();

  const included = lines(page.included);
  const excluded = lines(page.excluded);
  const itinerary = lines(page.itinerary);
  const hasTransfer = page.prices.some((p) => p.kind === "transport");
  const hours = page.duration_minutes ? page.duration_minutes / 60 : null;
  const isDemo = (page.title ?? "").startsWith("[DEMO]");
  const adult = page.prices.find((p) => p.kind === "adult");
  const fromPrice = adult ? formatMoney({ minor: adult.price_minor, currency: page.currency }, locale) : null;

  const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
    <section aria-labelledby={id} className="border-t border-line py-7">
      <h2 id={id} className="mb-3 text-h3 font-bold">{title}</h2>
      {children}
    </section>
  );
  const Pending = () => <p className="text-ink-muted">{t("experience.pending")}</p>;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-5">
        <nav aria-label={t("experience.breadcrumb")} className="text-small text-ink-muted">
          {t("experience.hurghada")} {page.category ? <>· {t(`categories.${page.category}` as "categories.sea")}</> : null}
        </nav>
        <h1 className="mt-2 font-display text-[32px] leading-tight md:text-[44px] rtl:font-sans rtl:font-bold">{page.title}</h1>
        {isDemo && <p className="mt-1 text-small font-semibold text-warning">{t("common.demo")}</p>}

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[15px] text-ink-muted">
          {hours && <span className="inline-flex items-center gap-1.5"><IconClock size={18} className="text-discovery" />{Number.isInteger(hours) ? t("experience.hours", { n: hours }) : t("experience.minutes", { n: page.duration_minutes! })}</span>}
          {page.category === "sea" && <span className="inline-flex items-center gap-1.5"><IconSea size={18} className="text-discovery" />{t("categories.sea")}</span>}
          {hasTransfer && <span className="inline-flex items-center gap-1.5"><IconCar size={18} className="text-discovery" />{t("experience.hotelPickup")}</span>}
          <span className="inline-flex items-center gap-1.5 font-semibold text-success"><IconCheck size={18} />{page.booking_mode === "instant" ? t("experience.instant") : t("experience.onRequest")}</span>
          <span className="rounded-full bg-discovery-tint px-3 py-0.5 text-small font-semibold text-discovery">{t("experience.newNoReviews")}</span>
        </div>

        <div className="mt-6">
          <FoldGallery images={page.media.map((m) => ({ src: m.path, alt: m.alt ?? page.title ?? "" }))} placeholder={t("experience.photo")} />
        </div>

        <div className="mt-8 flex flex-wrap items-start gap-10">
          <div className="min-w-0 flex-[999_1_560px]">
            {page.summary && <p className="mb-6 text-[18px]">{page.summary}</p>}
            {page.description && <div className="mb-6 whitespace-pre-line">{page.description}</div>}

            <Section id="inc" title={t("experience.included")}>
              {included.length || excluded.length || hasTransfer ? (
                <div className="grid gap-x-8 sm:grid-cols-2">
                  <ul className="flex flex-col gap-2">
                    {included.map((l) => <li key={l} className="flex gap-2.5"><IconCheck size={20} className="mt-0.5 shrink-0 text-success" />{l}</li>)}
                  </ul>
                  <ul className="flex flex-col gap-2 text-ink-muted">
                    {excluded.map((l) => <li key={l} className="flex gap-2.5"><IconClose size={20} className="mt-0.5 shrink-0" />{l}</li>)}
                    {hasTransfer && <li className="flex gap-2.5"><IconClose size={20} className="mt-0.5 shrink-0" />{t("experience.transferAddon")}</li>}
                  </ul>
                </div>
              ) : <Pending />}
            </Section>

            <Section id="itin" title={t("experience.itinerary")}>
              {itinerary.length ? (
                <ol className="flex flex-col gap-3">
                  {itinerary.map((l, i) => <li key={i} className="flex gap-4"><span className="font-bold text-discovery">{i + 1}</span><span>{l}</span></li>)}
                </ol>
              ) : <Pending />}
            </Section>

            <Section id="meet" title={t("experience.meeting")}>
              {hasTransfer && <p className="mb-3">{t("experience.meetingTransfer")}</p>}
              {page.meeting_info ? <p className="whitespace-pre-line">{page.meeting_info}</p> : <Pending />}
            </Section>

            {page.requirements && (
              <Section id="know" title={t("experience.goodToKnow")}>
                <ul className="flex list-disc flex-col gap-1 ps-5">{lines(page.requirements).map((l) => <li key={l}>{l}</li>)}</ul>
              </Section>
            )}

            {page.policy && (
              <Section id="cancel" title={t("experience.cancellation")}>
                <p>{t("experience.cancellationText", { hours: page.policy.free_cancel_hours })}</p>
              </Section>
            )}

            <Section id="op" title={t("experience.operatedBy")}>
              <p>{t("experience.operatorGeneric")}</p>
            </Section>
          </div>

          <div className="w-full flex-[1_1_360px] md:max-w-[400px]">
            <BookingWidget page={page} agency={agency} />
          </div>
        </div>
      </main>
      {/* Phone: the booking card sits below the details, so keep the price and a shortcut in reach */}
      <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 border-t border-line bg-surface px-4 py-3 md:hidden">
        {fromPrice && (
          <div>
            <div className="text-small text-ink-muted">{t("widget.from")}</div>
            <div className="text-[22px] font-bold leading-tight">{fromPrice}</div>
          </div>
        )}
        <a href="#book" className="flex min-h-13 items-center rounded-control bg-discovery px-6 font-bold text-white">{t("widget.chooseDeparture")}</a>
      </div>
    </>
  );
}
