import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { rpc } from "@/lib/data/rpc";
import type { ExperienceCard } from "@/lib/data/types";
import { CATEGORIES } from "@/lib/catalog";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CatalogBrowser } from "@/components/site/CatalogBrowser";
import { TripCard } from "@/components/site/TripCard";

type Props = { params: Promise<{ locale: string }> };

export const revalidate = 300; // the list is cached; filters run in the browser

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return { title: `${t("list.title")} · WENRO`, description: t("list.subtitle") };
}

export default async function ExperiencesList({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  let cards: ExperienceCard[] = [];
  try {
    cards = await rpc<ExperienceCard[]>("experience_list", { p_locale: locale }, "anon");
  } catch (e) {
    console.error("experience_list failed", e);
  }
  const present = CATEGORIES.filter((c) => cards.some((x) => x.category === c));
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 pb-10 pt-8">
        {/* Before the filters load (and for search engines): the full list */}
        <Suspense fallback={
          <>
            <h1 className="text-[30px] font-extrabold leading-tight md:text-[40px]">{t("list.title")}</h1>
            <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{cards.map((c) => <li key={c.id}><TripCard c={c} /></li>)}</ul>
          </>
        }>
          <CatalogBrowser cards={cards} categories={present.map((c) => ({ slug: c, name: t(`categories.${c}` as "categories.sea") }))} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
