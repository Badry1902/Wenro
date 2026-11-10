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
import { Mark, MotifImg } from "@/components/brand/Logo";
import { hasSlogans } from "@/lib/slogans";
import { CATEGORY_THEME, THEMES, patternStyle, themeFor } from "@/lib/themes";
import { ThemeMotif } from "@/components/brand/ThemeArt";

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
  const slogans = hasSlogans(locale);
  const collections = THEMES.map((th) => ({ th, n: cards.filter((c) => themeFor(c) === th).length })).filter((x) => x.n > 0);

  const SectionHead = ({ title, sub, href }: { title: string; sub?: string; href?: string | { pathname: string; query: Record<string, string> } }) => (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-[28px] font-extrabold leading-tight md:text-[34px]">{title}</h2>
        <span className="mt-2 block h-1.5 w-12 rounded-full bg-[linear-gradient(90deg,var(--color-apricot)_0_45%,transparent_45%_55%,var(--color-teal)_55%)]" aria-hidden="true" />
        {sub && <p className="mt-2 text-ink-muted">{sub}</p>}
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
        {slogans && (
          // Runs while the page is parsed: visitors from an ad or partner link see the campaign headline from the first paint.
          <script dangerouslySetInnerHTML={{ __html: "if(/[?&](ref|utm_campaign)=/.test(location.search))document.documentElement.dataset.campaign='1'" }} />
        )}
        <Hero
          photos={heroPhotos}
          campaign={slogans ? { title: t("home.campaignTitle"), subtitle: t("home.campaignSubtitle"), button: t("home.campaignButton") } : undefined}
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
                      <Link href={{ pathname: "/experiences", query: { cat: g.c } }} className="cat-tile group relative block aspect-[3/4] overflow-hidden rounded-card" style={patternStyle(CATEGORY_THEME[g.c] ?? "reef", "midnight", 220)}>
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

          {slogans && (
            <Reveal as="section" aria-label={t("home.howLabel")} className="mt-14">
              <ol className="relative grid gap-4 md:grid-cols-3 md:gap-6">
                <span aria-hidden="true" className="absolute inset-x-[16%] top-9 hidden border-t-2 border-dashed border-teal md:block" />
                {(["pin", "plan", "day"] as const).map((k, n) => (
                  <li key={k} className="relative flex items-start gap-4 rounded-card border border-line bg-surface p-5 md:flex-col md:items-center md:text-center">
                    <span className={`grid size-14 shrink-0 place-items-center rounded-2xl ${["bg-apricot-tint", "bg-aqua", "bg-discovery-tint"][n]}`}>
                      {n === 0 ? <Mark width={40} /> : <MotifImg name={n === 1 ? "starfish" : "turtle"} tone={n === 1 ? "persimmon" : "cobalt"} size={34} className="!static" />}
                    </span>
                    <span>
                      <h3 className="font-display text-[24px] font-black leading-tight">{t(`home.how.${k}.title`)}</h3>
                      <p className="mt-1 text-ink-muted">{t(`home.how.${k}.text`)}</p>
                    </span>
                  </li>
                ))}
              </ol>
            </Reveal>
          )}

          <RecentRail cards={cards} />

          <Reveal as="section" className="mt-14 grid gap-4 md:grid-cols-2">
            <Link href="/explore" className="reef reef-cobalt card-lift group relative min-h-[240px] overflow-hidden rounded-[28px] p-6 text-white md:p-8">
              <span className="absolute inset-0 bg-[linear-gradient(90deg,var(--color-discovery)_45%,rgb(37_60_150/0.35))] rtl:bg-[linear-gradient(270deg,var(--color-discovery)_45%,rgb(37_60_150/0.35))]" aria-hidden="true" />
              <MotifImg name="turtle" tone="persimmon" size={120} className="motif-drift -bottom-3 end-4 md:end-8" />
              <MotifImg name="fish" tone="white" size={48} className="motif-drift-slow end-36 top-8 opacity-90 max-md:hidden" />
              <span className="relative inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-small font-bold uppercase tracking-wider">{t("home.exploreEyebrow")}</span>
              <span className="relative mt-3 block max-w-sm font-display text-[26px] font-extrabold leading-tight md:text-[30px]">{t("home.exploreTitle")}</span>
              <span className="relative mt-2 block max-w-xs text-white/90">{t("home.exploreText")}</span>
              <span className="btn-press relative mt-5 inline-flex min-h-11 items-center gap-1 rounded-full bg-white px-5 font-bold text-discovery">{t("home.exploreCta")}<IconChevron size={18} className="rtl:rotate-180" /></span>
            </Link>
            <Link href="/plan" className="reef reef-aqua card-lift group relative min-h-[240px] overflow-hidden rounded-[28px] p-6 text-ink md:p-8">
              <span className="absolute inset-0 bg-[linear-gradient(90deg,var(--color-aqua)_45%,rgb(196_231_229/0.3))] rtl:bg-[linear-gradient(270deg,var(--color-aqua)_45%,rgb(196_231_229/0.3))]" aria-hidden="true" />
              <MotifImg name="starfish" tone="persimmon" size={92} className="motif-drift -bottom-2 end-6 md:end-10" />
              <MotifImg name="seagrass" tone="cobalt" size={70} className="motif-drift-slow end-32 top-6 max-md:hidden" />
              <span className="relative inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-small font-bold uppercase tracking-wider text-teal-ink">{t("home.planEyebrow")}</span>
              <span className="relative mt-3 block max-w-sm font-display text-[26px] font-extrabold leading-tight md:text-[30px]">{t("home.planTitle")}</span>
              <span className="relative mt-2 block max-w-xs text-ink/85">{t("home.planText")}</span>
              <span className="btn-press relative mt-5 inline-flex min-h-11 items-center gap-1 rounded-full bg-ink px-5 font-bold text-white">{t("home.planCta")}<IconChevron size={18} className="rtl:rotate-180" /></span>
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

        {collections.length > 1 && (
          <Reveal as="section" className="mx-auto mt-20 max-w-7xl px-4">
            <SectionHead title={t("themes.title")} sub={t("themes.sub")} />
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {collections.map(({ th, n }) => (
                <li key={th}>
                  <Link href={{ pathname: "/experiences", query: { theme: th } }} className="card-lift group flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface">
                    <span className="relative block h-36 overflow-hidden md:h-40" style={patternStyle(th, "feature", 300)} aria-hidden="true">
                      <span className="absolute -bottom-7 start-5 grid size-16 place-items-center rounded-2xl bg-white shadow-[0_10px_24px_-12px_rgb(25_36_78/0.5)]">
                        <ThemeMotif theme={th} size={40} />
                      </span>
                    </span>
                    <span className="flex flex-1 flex-col gap-1 p-5 pt-10">
                      <span className="font-display text-[22px] font-extrabold leading-tight">{t(`themes.${th}.name`)}</span>
                      <span className="text-ink-muted">{t(`themes.${th}.blurb`)}</span>
                      <span className="mt-auto flex items-center justify-between pt-3 text-small font-bold">
                        <span className="text-teal-ink">{t("themes.tripsCount", { n })}</span>
                        <span className="inline-flex items-center gap-1 text-discovery">{t("themes.see")}<IconChevron size={16} className="transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" /></span>
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Reveal>
        )}

        <Reveal as="section" className="relative mt-24 overflow-hidden bg-ivory">
          <MotifImg name="coral" tone="persimmon" size={150} className="-bottom-8 -end-6 opacity-90 max-md:hidden" />
          <MotifImg name="seagrass" tone="aqua" size={110} className="motif-drift-slow -start-4 top-6 max-md:hidden" />
          <div className="relative mx-auto max-w-7xl px-4 py-16">
            <h2 className="text-[28px] font-extrabold md:text-[34px]">{t("home.whyTitle")}</h2>
            <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {([[IconCash, "why1"], [IconCheck, "why2"], [IconShield, "why3"], [IconCar, "why4"]] as const).map(([Icon, k]) => (
                <li key={k} className="flex flex-col gap-2 rounded-card bg-white p-5 shadow-[0_12px_30px_-20px_rgb(25_36_78/0.35)]">
                  <span className={`grid size-12 place-items-center rounded-2xl ${["bg-apricot-tint text-apricot-hover", "bg-aqua-tint text-teal-ink", "bg-discovery-tint text-discovery", "bg-apricot-tint text-apricot-hover"][["why1", "why2", "why3", "why4"].indexOf(k)]}`}><Icon size={24} /></span>
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

          <Reveal as="section" className="reef reef-midnight relative mt-20 overflow-hidden rounded-[32px] px-6 py-12 text-white md:px-14 md:py-16">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,var(--color-ink)_35%,transparent)] rtl:bg-[linear-gradient(270deg,var(--color-ink)_35%,transparent)]" aria-hidden="true" />
            <div className="relative flex flex-col items-start gap-5 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <h2 className="text-[28px] font-extrabold md:text-[36px]">{t("home.partnerTitle")}</h2>
                <p className="mt-2 text-white/85">{t("home.partnerText")}</p>
              </div>
              <Link href="/signin" className="btn-press inline-flex min-h-12 shrink-0 items-center rounded-full bg-apricot px-7 font-extrabold text-ink hover:bg-apricot-hover">{t("home.partnerCta")}</Link>
            </div>
          </Reveal>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
