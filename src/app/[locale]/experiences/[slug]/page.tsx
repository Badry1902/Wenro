import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { cityBySlug, km, nearestCity } from "@/lib/places";
import { rpc } from "@/lib/data/rpc";
import { formatMoney } from "@/lib/money";
import type { ExperienceCard, ExperiencePage, ReviewSummary } from "@/lib/data/types";
import { Link } from "@/i18n/navigation";
import { mediaSrc } from "@/lib/media";
import { cardImages, similarTo } from "@/lib/catalog";
import { siteUrl } from "@/lib/env";
import { routing } from "@/i18n/routing";
import { ShareButton } from "@/components/site/ShareButton";
import { RecentTracker } from "@/components/site/Recent";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Gallery } from "@/components/site/Gallery";
import { Rail, RailItem } from "@/components/site/Rail";
import { TripCard } from "@/components/site/TripCard";
import { WishButton } from "@/components/site/WishButton";
import { BookingWidget } from "@/components/BookingWidget";
import { RefBeacon } from "@/components/site/RefBeacon";
import { ReviewsSection, Stars } from "@/components/site/Reviews";
import { MeetingMap } from "@/components/site/MeetingMap";
import { PartnerShareBar } from "@/components/site/PartnerShareBar";
import { patternStyle, themeFor } from "@/lib/themes";
import { ThemeBadge, ThemeMotif } from "@/components/brand/ThemeArt";
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
  if (!page) return {};
  const cover = page.media.find((m) => m.kind !== "video");
  const image = cover ? mediaSrc(cover.path, { w: 1200, h: 630 }) : undefined;
  return {
    title: `${page.title} · WENRO`,
    description: page.summary ?? undefined,
    alternates: { canonical: `${siteUrl()}/${locale}/experiences/${slug}`, languages: Object.fromEntries(routing.locales.map((l) => [l, `${siteUrl()}/${l}/experiences/${slug}`])) },
    openGraph: { type: "website", title: page.title ?? "WENRO", description: page.summary ?? undefined, images: image ? [{ url: image, width: 1200, height: 630 }] : undefined, siteName: "WENRO", locale },
    twitter: { card: "summary_large_image", title: page.title ?? "WENRO", description: page.summary ?? undefined, images: image ? [image] : undefined },
  };
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
  const noReviews: ReviewSummary = { count: 0, average: null, stars: {}, items: [] };
  const [reviews, location] = await Promise.all([
    rpc<ReviewSummary>("experience_reviews", { p_experience: page.id, p_limit: 12 }, "anon").catch(() => noReviews),
    rpc<{ lat: number | null; lng: number | null; place: string | null; exact: boolean; city?: string | null;
      activity?: { lat: number; lng: number; place: string | null } | null } | null>("public_location", { p_experience: page.id }, "anon").catch(() => null),
  ]);
  const similar = similarTo(all, page, 8);
  const t = await getTranslations();
  // the trip's city: the operator's choice, else the city closest to the meeting point; "Egypt" until either is set
  const meet = location && location.lat != null && location.lng != null ? { lat: Number(location.lat), lng: Number(location.lng) } : null;
  const home = meet ? nearestCity(meet.lat, meet.lng) : null;
  const citySlug = cityBySlug(location?.city)?.slug ?? (home && home.km < 60 ? home.city.slug : null);
  const where = citySlug ? t(`places.city.${citySlug}` as "places.city.hurghada") : t("experience.hurghada");
  const act = location?.activity ?? null;
  const actKm = act && meet ? Math.round(km(meet.lat, meet.lng, Number(act.lat), Number(act.lng))) : null;

  const included = lines(page.included);
  const excluded = lines(page.excluded);
  const itinerary = lines(page.itinerary);
  const hasTransfer = page.prices.some((p) => p.kind === "transport");
  const hours = page.duration_minutes ? page.duration_minutes / 60 : null;
  const isDemo = page.slug.startsWith("demo-"); // demo content is marked by its address, see supabase/demo
  const adult = page.prices.find((p) => p.kind === "adult");
  const catName = page.category ? t(`categories.${page.category}` as "categories.sea") : "";
  const fromPrice = adult ? formatMoney({ minor: adult.price_minor, currency: page.currency }, locale) : null;

  const theme = themeFor(page);
  const Section = ({ id, title, motif, children }: { id: string; title: string; motif?: number; children: React.ReactNode }) => (
    <section aria-labelledby={id} className="border-t border-line py-7">
      <h2 id={id} className="mb-3 flex items-center gap-2.5 text-h3 font-bold">
        {motif != null && <span className="grid size-9 place-items-center rounded-xl bg-aqua-tint" aria-hidden="true"><ThemeMotif theme={theme} index={motif} size={22} /></span>}
        {title}
      </h2>
      {children}
    </section>
  );
  const Pending = () => <p className="text-ink-muted">{t("experience.pending")}</p>;

  return (
    <>
      <SiteHeader />
      {/* The trip's collection design: a printed band above the page (no text on the pattern) */}
      <div className="relative h-16 md:h-24" style={patternStyle(theme, "feature", 260)}>
        <div className="mx-auto flex h-full max-w-7xl items-end px-4">
          <Link href={{ pathname: "/experiences", query: { theme } }} className="btn-press translate-y-1/2 rounded-full ring-4 ring-white">
            <ThemeBadge theme={theme} label={t("themes.partOf", { name: t(`themes.${theme}.name`) })} showLabel size={24} />
          </Link>
        </div>
      </div>
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-8">
        <nav aria-label={t("experience.breadcrumb")} className="flex flex-wrap items-center gap-1 text-small text-ink-muted">
          <Link href="/" className="hover:text-discovery">{t("nav.home")}</Link>
          <IconChevron size={14} />
          <Link href="/experiences" className="hover:text-discovery">{where}</Link>
          {page.category && (<><IconChevron size={14} /><Link href={{ pathname: "/experiences", query: { cat: page.category } }} className="hover:text-discovery">{catName}</Link></>)}
        </nav>
        <div className="mt-3 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-[28px] leading-tight md:text-[44px]">{page.title}</h1>
            {isDemo && <p className="mt-1 text-small font-semibold text-warning">{t("common.demo")}</p>}
          </div>
          <div className="mt-1 flex shrink-0 gap-2">
            <ShareButton title={page.title ?? "WENRO"} />
            <WishButton id={page.id} variant="plain" />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[15px] text-ink-muted">
          {page.category && <span className="inline-flex items-center gap-1.5"><IconCategory name={page.category} size={18} className="text-discovery" />{catName}</span>}
          {hours && <span className="inline-flex items-center gap-1.5"><IconClock size={18} className="text-discovery" />{Number.isInteger(hours) ? t("experience.hours", { n: hours }) : t("experience.minutes", { n: page.duration_minutes! })}</span>}
          {hasTransfer && <span className="inline-flex items-center gap-1.5"><IconCar size={18} className="text-discovery" />{t("experience.hotelPickup")}</span>}
          <span className="inline-flex items-center gap-1.5"><IconPin size={18} className="text-discovery" />{where}</span>
          {reviews.count > 0 ? (
            <a href="#reviews-list" className="inline-flex items-center gap-1.5 font-semibold text-ink hover:underline">
              <Stars value={Number(reviews.average)} /> {Number(reviews.average).toFixed(1)} <span className="font-normal text-ink-muted">({t("reviews.count", { n: reviews.count })})</span>
            </a>
          ) : <span className="rounded-full bg-discovery-tint px-3 py-0.5 text-small font-semibold text-discovery">{t("experience.newNoReviews")}</span>}
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

            <Section id="inc" title={t("experience.included")} motif={2}>
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

            <Section id="itin" title={t("experience.itinerary")} motif={1}>
              {itinerary.length ? (
                <ol className="flex flex-col gap-3">
                  {itinerary.map((l, i) => <li key={i} className="flex gap-4"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-apricot-tint text-small font-extrabold text-ink">{i + 1}</span><span className="pt-0.5">{l}</span></li>)}
                </ol>
              ) : <Pending />}
            </Section>

            <Section id="meet" title={t("experience.meeting")} motif={3}>
              {hasTransfer && <p className="mb-3">{t("experience.meetingTransfer")}</p>}
              {page.meeting_info ? <p className="whitespace-pre-line">{page.meeting_info}</p> : !meet && <Pending />}
              {location && meet && (
                <MeetingMap className="mt-4" point={meet} exact={location.exact}
                  label={location.place ?? t("experience.meeting")} openLabel={t("map.open")} note={location.exact ? t("map.exactNote") : t("map.areaNote")} />
              )}
              {act && (
                <div className="mt-5">
                  <p className="mb-2 font-bold">{t("experience.place.goesTo")}: {act.place ?? ""}{actKm != null && actKm > 3 && <span className="font-normal text-ink-muted"> · {t("experience.place.far", { km: actKm })}</span>}</p>
                  <MeetingMap point={{ lat: Number(act.lat), lng: Number(act.lng) }} exact label={act.place ?? t("experience.place.goesTo")} openLabel={t("map.open")} />
                </div>
              )}
            </Section>

            {page.requirements && (
              <Section id="know" title={t("experience.goodToKnow")} motif={4}>
                <ul className="flex list-disc flex-col gap-1 ps-5">{lines(page.requirements).map((l) => <li key={l}>{l}</li>)}</ul>
              </Section>
            )}

            {page.policy && (
              <Section id="cancel" title={t("experience.cancellation")}>
                <p>{t("experience.cancellationText", { hours: page.policy.free_cancel_hours })}</p>
              </Section>
            )}

            <ReviewsSection data={reviews} />

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
      <PartnerShareBar slug={page.slug} title={page.title ?? "WENRO"} />
      <RecentTracker id={page.id} />
      {/* Structured data for search engines: a bookable trip with its starting price */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org", "@type": "TouristTrip", name: page.title, description: page.summary,
        url: `${siteUrl()}/${locale}/experiences/${page.slug}`,
        image: page.media.filter((m) => m.kind !== "video").slice(0, 4).map((m) => mediaSrc(m.path, { w: 1200, h: 800 })),
        touristType: page.category ?? undefined,
        provider: { "@type": "Organization", name: "WENRO", url: siteUrl() },
        // Only real, published guest reviews (never added when there are none)
        aggregateRating: reviews.count > 0 ? { "@type": "AggregateRating", ratingValue: Number(reviews.average), reviewCount: reviews.count, bestRating: 5, worstRating: 1 } : undefined,
        offers: adult ? { "@type": "Offer", price: (adult.price_minor / 100).toFixed(2), priceCurrency: page.currency, availability: page.slots.length ? "https://schema.org/InStock" : "https://schema.org/SoldOut", url: `${siteUrl()}/${locale}/experiences/${page.slug}` } : undefined,
      }).replace(/</g, "\\u003c") }} />
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
