import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { rpc } from "@/lib/data/rpc";
import { withCoords } from "@/lib/data/coords";
import type { ExperienceCard } from "@/lib/data/types";
import { CATEGORIES } from "@/lib/catalog";
import { SiteHeader } from "@/components/SiteHeader";
import { ExploreMapLoader } from "@/components/site/ExploreMapLoader";
import { hasSlogans } from "@/lib/slogans";
import { patternStyle } from "@/lib/themes";

type Props = { params: Promise<{ locale: string }> };
export const revalidate = 300;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return { title: `${t("explore.title")} · WENRO`, description: t("explore.sub") };
}

/** Explore Hurghada on a map. */
export default async function Explore({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const cards = await withCoords(await rpc<ExperienceCard[]>("experience_list", { p_locale: locale }, "anon").catch(() => [] as ExperienceCard[]));
  const cats = CATEGORIES.filter((c) => cards.some((x) => x.category === c && x.lat != null)).map((c) => ({ slug: c, name: t(`categories.${c}` as "categories.sea") }));
  return (
    <>
      <SiteHeader />
      <div className="flex h-[calc(100dvh-64px)] flex-col">
        {/* Discovery intro, right above the map where the traveller picks an area */}
        <div className="relative overflow-hidden border-b border-line" style={patternStyle("trail", "aqua", 240)}>
          <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--color-aqua)_40%,rgb(196_231_229/0.6))] rtl:bg-[linear-gradient(270deg,var(--color-aqua)_40%,rgb(196_231_229/0.6))]" aria-hidden="true" />
          <div className="relative mx-auto flex max-w-7xl flex-col gap-0.5 px-4 py-4 md:py-5">
            <h1 className="font-display text-[24px] font-black leading-tight md:text-[32px]">{hasSlogans(locale) ? t("explore.slogan") : t("explore.title")}</h1>
            <p className="text-small text-ink/80 md:text-body">{t("explore.sub")}</p>
          </div>
        </div>
        <div className="min-h-0 flex-1"><ExploreMapLoader cards={cards} categories={cats} /></div>
      </div>
    </>
  );
}
