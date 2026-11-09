import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { rpc } from "@/lib/data/rpc";
import type { ExperienceCard } from "@/lib/data/types";
import { mediaSrc } from "@/lib/media";
import { CATEGORIES, cardImages } from "@/lib/catalog";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Hero } from "@/components/site/Hero";
import { Rail, RailItem } from "@/components/site/Rail";
import { Reveal } from "@/components/site/Reveal";
import { TripCard } from "@/components/site/TripCard";
import { RecentRail } from "@/components/site/Recent";
import { IconCar, IconCash, IconCategory, IconCheck, IconChevron, IconShield } from "@/components/Icons";

export const revalidate = 300;

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  let cards: ExperienceCard[] = [];
  try {
    cards = await rpc<ExperienceCard[]>("experience_list", { p_locale: locale }, "anon");
  } catch (e) {
    console.error("experience_list failed", e); // e.g. build without database access; refreshed later
  }

  const catName = (c: string) => t(`categories.${c}` as "categories.sea");
  const byCat = CATEGORIES.map((c) => ({ c, items: cards.filter((x) => x.category === c) })).filter((g) => g.items.length);
  // One standout trip per category, then the rest, so the first row shows the range
  const picks = [...byCat.map((g) => g.items[0]), ...cards.filter((x) => !byCat.some((g) => g.items[0] === x))].slice(0, 10);
  const heroPhotos = byCat.slice(0, 6).map((g) => ({ src: cardImages(g.items[0])[0], alt: g.items[0].title ?? "" })).filter((p) => p.src);
  const railLabels = { prev: t("home.prev"), next: t("home.next") };
  const rails = byCat.filter((g) => g.items.length >= 3).slice(0, 5);

  const SectionHead = ({ title, sub, href }: { title: string; sub?: string; href?: string | { pathname: string; query: Record<string, string> } }) => (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-[26px] font-extrabold leading-tight md:text-[32px]">{title}</h2>
        {sub && <p className="mt-1 text-ink-muted">{sub}</p>}
      </div>
      {href && (
        <Link href={href} className="group inline-flex min-h-11 shrink-0 items-center gap-1 font-bold text-discovery">
          {t("home.seeAll")}<IconChevron size={18} className="transition-transform duration-200 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
        </Link>
      )}
    </div>
  );

  return (
    <>
      <SiteHeader />
      <main>
        <Hero
          photos={heroPhotos}
          categories={CATEGORIES.map((c) => ({ slug: c, name: catName(c) }))}
          labels={{
            eyebrow: t("home.heroEyebrow"), title: t("home.heroTitle"), subtitle: t("home.heroSubtitle"), searchLabel: t("home.searchLabel"),
            placeholder: t("home.searchPlaceholder"), category: t("home.searchCategory"), all: t("home.allCategories"), button: t("home.searchButton"),
          }}
        />

        <div className="mx-auto max-w-7xl px-4">
          {cards.length === 0 && <p className="mt-14 text-ink-muted">{t("home.empty")}</p>}

          {byCat.length > 0 && (
            <Reveal as="section" className="mt-14">
              <SectionHead title={t("home.browseCategories")} href="/experiences" />
              <Rail labels={railLabels}>
                {byCat.map((g) => {
                  const img = cardImages(g.items[0])[0];
                  return (
                    <div key={g.c} className="w-[46%] shrink-0 snap-start sm:w-[30%] md:w-[22%] lg:w-[15.6%]">
                      <Link href={{ pathname: "/experiences", query: { cat: g.c } }} className="cat-tile group relative block aspect-[3/4] overflow-hidden rounded-card bg-ink">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {img && <img src={mediaSrc(img, { w: 420, h: 560 })} alt="" loading="lazy" className="cat-tile-img h-full w-full object-cover opacity-90" />}
                        <span className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/10 to-transparent" />
                        <span className="absolute start-3 top-3 grid size-10 place-items-center rounded-full bg-white/90 text-ink backdrop-blur transition-colors group-hover:bg-apricot">
                          <IconCategory name={g.c} size={20} />
                        </span>
                        <span className="absolute inset-x-3 bottom-3 text-white">
                          <span className="block text-[18px] font-extrabold leading-tight">{catName(g.c)}</span>
                          <span className="block text-small text-white/80">{t("home.tripsCount", { n: g.items.length })}</span>
                        </span>
                      </Link>
                    </div>
                  );
                })}
              </Rail>
            </Reveal>
          )}

          <RecentRail cards={cards} />

          <Reveal as="section" className="mt-14 grid gap-4 md:grid-cols-2">
            <Link href="/explore" className="group relative overflow-hidden rounded-[24px] bg-discovery p-6 text-white md:p-8">
              <span className="pointer-events-none absolute -end-10 -top-10 size-48 rounded-full bg-white/10 transition-transform duration-500 group-hover:scale-125" aria-hidden="true" />
              <span className="relative block text-small font-bold uppercase tracking-wider text-white/80">{t("home.exploreEyebrow")}</span>
              <span className="relative mt-1 block text-[24px] font-extrabold leading-tight md:text-[28px]">{t("home.exploreTitle")}</span>
              <span className="relative mt-2 block max-w-sm text-white/85">{t("home.exploreText")}</span>
              <span className="relative mt-4 inline-flex min-h-11 items-center rounded-full bg-white px-5 font-bold text-discovery">{t("home.exploreCta")}</span>
            </Link>
            <Link href="/plan" className="group relative overflow-hidden rounded-[24px] bg-apricot p-6 text-ink md:p-8">
              <span className="pointer-events-none absolute -end-10 -top-10 size-48 rounded-full bg-white/25 transition-transform duration-500 group-hover:scale-125" aria-hidden="true" />
              <span className="relative block text-small font-bold uppercase tracking-wider text-ink/70">{t("home.planEyebrow")}</span>
              <span className="relative mt-1 block text-[24px] font-extrabold leading-tight md:text-[28px]">{t("home.planTitle")}</span>
              <span className="relative mt-2 block max-w-sm text-ink/80">{t("home.planText")}</span>
              <span className="relative mt-4 inline-flex min-h-11 items-center rounded-full bg-ink px-5 font-bold text-white">{t("home.planCta")}</span>
            </Link>
          </Reveal>

          {picks.length > 0 && (
            <Reveal as="section" className="mt-16">
              <SectionHead title={t("home.topPicks")} sub={t("home.topPicksSub")} href="/experiences" />
              <Rail labels={railLabels}>
                {picks.map((c, k) => <RailItem key={c.id}><TripCard c={c} priority={k < 4} /></RailItem>)}
              </Rail>
            </Reveal>
          )}
        </div>

        <Reveal as="section" className="mt-20 bg-apricot-tint">
          <div className="mx-auto max-w-7xl px-4 py-14">
            <h2 className="text-[26px] font-extrabold md:text-[32px]">{t("home.whyTitle")}</h2>
            <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {([[IconCash, "why1"], [IconCheck, "why2"], [IconShield, "why3"], [IconCar, "why4"]] as const).map(([Icon, k]) => (
                <li key={k} className="flex flex-col gap-2">
                  <span className="grid size-12 place-items-center rounded-full bg-white text-discovery shadow-sm"><Icon size={24} /></span>
                  <span className="mt-1 text-h3 font-bold">{t(`home.${k}Title` as "home.why1Title")}</span>
                  <span className="text-ink-muted">{t(`home.${k}Text` as "home.why1Text")}</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <div className="mx-auto max-w-7xl px-4">
          {rails.map((g) => (
            <Reveal as="section" key={g.c} className="mt-16">
              <SectionHead title={catName(g.c)} sub={t(`catBlurb.${g.c}` as "catBlurb.sea")} href={{ pathname: "/experiences", query: { cat: g.c } }} />
              <Rail labels={railLabels}>
                {g.items.map((c) => <RailItem key={c.id}><TripCard c={c} /></RailItem>)}
              </Rail>
            </Reveal>
          ))}

          <Reveal as="section" className="relative mt-20 overflow-hidden rounded-[28px] bg-discovery px-6 py-12 text-white md:px-14">
            <div className="pointer-events-none absolute -end-24 -top-24 size-72 rounded-full bg-apricot/30 blur-2xl" aria-hidden="true" />
            <div className="relative flex flex-col items-start gap-5 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <h2 className="text-[26px] font-extrabold md:text-[32px]">{t("home.partnerTitle")}</h2>
                <p className="mt-2 text-white/85">{t("home.partnerText")}</p>
              </div>
              <Link href="/signin" className="btn-press inline-flex min-h-12 shrink-0 items-center rounded-full bg-white px-7 font-bold text-discovery hover:bg-apricot-tint">{t("home.partnerCta")}</Link>
            </div>
          </Reveal>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
