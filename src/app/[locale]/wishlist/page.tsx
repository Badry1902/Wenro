import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { rpc } from "@/lib/data/rpc";
import type { ExperienceCard } from "@/lib/data/types";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { WishlistGrid } from "@/components/site/Recent";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return { title: `${t("wishlist.title")} · WENRO`, robots: { index: false } };
}

export default async function Wishlist({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const cards = await rpc<ExperienceCard[]>("experience_list", { p_locale: locale }, "anon").catch(() => [] as ExperienceCard[]);
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 pb-10 pt-8">
        <h1 className="text-[30px] font-extrabold leading-tight md:text-[40px]">{t("wishlist.title")}</h1>
        <p className="mb-8 mt-1 text-ink-muted">{t("wishlist.sub")}</p>
        <WishlistGrid cards={cards} />
      </main>
      <SiteFooter />
    </>
  );
}
