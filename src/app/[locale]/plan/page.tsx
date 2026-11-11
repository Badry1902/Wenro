import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { rpc } from "@/lib/data/rpc";
import { withCoords } from "@/lib/data/coords";
import type { ExperienceCard } from "@/lib/data/types";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PlanTabs } from "@/components/site/PlanTabs";

type Props = { params: Promise<{ locale: string }> };
export const revalidate = 300;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return { title: `${t("plan.title")} · WENRO`, description: t("plan.sub") };
}

export default async function Plan({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const cards = await withCoords(await rpc<ExperienceCard[]>("experience_list", { p_locale: locale }, "anon").catch(() => [] as ExperienceCard[]));
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="font-display text-[34px] leading-tight md:text-[44px]">{t("plan.title")}</h1>
        <p className="mb-6 mt-1 max-w-2xl text-ink-muted">{t("plan.sub")}</p>
        <PlanTabs cards={cards} />
      </main>
      <SiteFooter />
    </>
  );
}
