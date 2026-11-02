import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { rpc } from "@/lib/data/rpc";
import { formatMoney } from "@/lib/money";
import type { ExperienceCard, ExperiencePage } from "@/lib/data/types";
import { Link } from "@/i18n/navigation";
import { mediaSrc } from "@/lib/media";
import { cardImages, similarTo } from "@/lib/catalog";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Gallery } from "@/components/site/Gallery";
import { Rail, RailItem } from "@/components/site/Rail";
import { TripCard } from "@/components/site/TripCard";
import { WishButton } from "@/components/site/WishButton";
import { BookingWidget } from "@/components/BookingWidget";
import { RefBeacon } from "@/components/site/RefBeacon";
import { IconCar, IconCash, IconCategory, IconCheck, IconChevron, IconClock, IconClose, IconPin } from "@/components/Icons";

// Cached for a minute and refreshed in the background, so visitors get it from the CDN. Seats are
// checked again, live, on the booking page and in the database, so a cached seat count never overbooks.
export const revalidate = 60;
// Pages are built on the first visit and then served from the cache.
export function generateStaticParams() { return []; }

type Params = { params: Promise<{ locale: string; slug: string }> };

async function load(slug: string, locale: string) {
  return rpc<ExperiencePage | null>("experience_page", { p_slug: slug, p_locale: locale }, "anon");
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, slug } = await params;
  const page = await load(slug, locale);
  return page ? { title: `${page.title} · WENRO`, description: page.summary ?? undefined } : {};
}

const lines = (text: string | null) => (text ?? "").split("\n").map((l) => l.trim()).filter(Boolean);

export default async function ExperiencePageView({ params }: Params) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const [page, all] = await Promise.all([
    load(slug, locale),
    rpc<ExperienceCard[]>("experience_list", { p_locale: locale }, "anon").catch(() => [] as ExperienceCard[]),
  ]);
  if (!page) notFound();
  const similar = similarTo(all, page, 8);
  const t = await getTranslations();

  const included = lines(page.included);
  const excluded = lines(page.excluded);
  const itinerary = lines(page.itinerary);
  const hasTransfer = page.prices.some((p) => p.kind === "transport");
  const hours = page.duration_minutes ? page.duration_minutes / 60 : null;
  const isDemo = page.slug.startsWith("demo-"); // demo content is marked by its address, see supabase/demo
  const adult = page.prices.find((p) => p.kind === "adult");
  const catName = page.category ? t(`categories.${page.category}` as "categories.sea") : "";
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
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-5">
        <nav aria-label={t("experience.breadcrumb")} className="flex flex-wrap items-center gap-1 text-small text-ink-muted">
          <Link href="/" className="hover:text-discovery">{t("nav.home")}</Link>
          <IconChevron size={14} />
          <Link href="/experiences" className="hover:text-discovery">{t("experience.hurghada")}</Link>
          {page.category && (<><IconChevron size={14} /><Link href={{ pathname: "/experiences", query: { cat: page.category } }} className="hover:text-discovery">{catName}</Link></>)}
        </nav>
        <div className="mt-3 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-[32px] leading-tight md:text-[44px] rtl:font-sans rtl:font-extrabold">{page.title}</h1>
            {isDemo && <p className="mt-1 text-small font-semibold text-warning">{t("common.demo")}</p>}
          </div>
          <WishButton id={page.id} variant="plain" className="mt-1 shrink-0" />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[15px] text-ink-muted">
          {page.category && <span className="inline-flex items-center gap-1.5"><IconCategory name={page.category} size={18} className="text-discovery" />{catName}</span>}
          {hours && <span className="inline-flex items-center gap-1.5"><IconClock size={18} className="text-discovery" />{Number.isInteger(hours) ? t("experience.hours", { n: hours }) : t("experience.minutes", { n: page.duration_minutes! })}</span>}
          {hasTransfer && <span className="inline-flex items-center gap-1.5"><IconCar size={18} className="text-discovery" />{t("experience.hotelPickup")}</span>}
          <span className="inline-flex items-center gap-1.5"><IconPin size={18} className="text-discovery" />{t("experience.hurghada")}</span>
          <span className="rounded-full bg-discovery-tint px-3 py-0.5 text-small font-semibold text-discovery">{t("experience.newNoReviews")}</span>
        </div>

        <div className="mt-6">
          <Gallery items={page.media.map((m) => ({ src: m.path, alt: m.alt ?? page.title ?? "", kind: m.kind }))} placeholder={t("experience.photo")} />
        </div>

        <ul className="mt-6 grid gap-3 sm:grid-cols-3">
          {page.policy && (
            <li className="flex items-start gap-3 rounded-card bg-success-tint p-4">
              <IconCheck size={22} className="mt-0.5 shrink-0 text-success" />
              <span><span className="block font-bold">{t("home.why2Title")}</span><span className="text-small text-ink-muted">{t("home.freeCancel", { h: page.policy.free_cancel_hours })}</span></span>
            </li>
          )}
          <li className="flex items-start gap-3 rounded-card bg-discovery-tint p-4">
            <IconClock size={22} className="mt-0.5 shrink-0 text-discovery" />
            <span className="font-bold">{page.booking_mode === "instant" ? t("experience.instant") : t("experience.onRequest")}</span>
          </li>
          <li className="flex items-start gap-3 rounded-card bg-apricot-tint p-4">
            <IconCash size={22} className="mt-0.5 shrink-0 text-ink" />
            <span><span className="block font-bold">{t("home.why1Title")}</span><span className="text-small text-ink-muted">{t("footer.pay")}</span></span>
          </li>
        </ul>

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
                    {hasTransfer && !excluded.some((l) => /transfer|توصيل/i.test(l)) && <li className="flex gap-2.5"><IconClose size={20} className="mt-0.5 shrink-0" />{t("experience.transferAddon")}</li>}
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

          <div className="flex w-full flex-[1_1_360px] flex-col gap-8 md:max-w-[400px]">
            <BookingWidget page={page} />
            {similar.length > 0 && (
              <aside aria-labelledby="similar-aside" className="rounded-card border border-line bg-surface p-4">
                <h2 id="similar-aside" className="mb-3 text-h3 font-bold">{t("similar.aside")}</h2>
                <ul className="flex flex-col">
                  {similar.slice(0, 4).map((c) => {
                    const img = cardImages(c)[0];
                    return (
                      <li key={c.id}>
                        <Link href={`/experiences/${c.slug}`} className="group flex items-center gap-3 rounded-control p-2 transition-colors hover:bg-discovery-tint">
                          <span className="relative size-20 shrink-0 overflow-hidden rounded-[12px] bg-discovery-tint">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {img && <img src={mediaSrc(img, { w: 160, h: 160 })} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="line-clamp-2 font-bold leading-snug group-hover:text-discovery">{c.title}</span>
                            {c.from_minor != null && (
                              <span className="mt-1 block text-small text-ink-muted">{t("home.from", { price: formatMoney({ minor: c.from_minor, currency: c.currency }, locale) })}</span>
                            )}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </aside>
            )}
          </div>
        </div>

        {similar.length > 4 && (
          <section aria-labelledby="similar-rail" className="mt-16 border-t border-line pt-10">
            <h2 id="similar-rail" className="mb-5 text-[26px] font-extrabold">{t("similar.rail")}</h2>
            <Rail labels={{ prev: t("home.prev"), next: t("home.next") }}>
              {similar.map((c) => <RailItem key={c.id}><TripCard c={c} /></RailItem>)}
            </Rail>
          </section>
        )}
      </main>
      <RefBeacon experienceId={page.id} />
      <SiteFooter />
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
