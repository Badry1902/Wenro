import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { rpc } from "@/lib/data/rpc";
import type { ExperienceCard } from "@/lib/data/types";
import { CATEGORIES } from "@/lib/catalog";
import { SiteHeader } from "@/components/SiteHeader";
import { ExploreMapLoader } from "@/components/site/ExploreMapLoader";

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
  const cards = await rpc<ExperienceCard[]>("experience_list", { p_locale: locale }, "anon").catch(() => [] as ExperienceCard[]);
  const cats = CATEGORIES.filter((c) => cards.some((x) => x.category === c && x.lat != null)).map((c) => ({ slug: c, name: t(`categories.${c}` as "categories.sea") }));
  return (
    <>
      <SiteHeader />
      <h1 className="sr-only">{t("explore.title")}</h1>
      <ExploreMapLoader cards={cards} categories={cats} />
    </>
  );
}
