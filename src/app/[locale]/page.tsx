import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { rpc } from "@/lib/data/rpc";
import type { ExperienceCard } from "@/lib/data/types";
import { formatMoney } from "@/lib/money";
import { SiteHeader } from "@/components/SiteHeader";

export const revalidate = 300; // list refreshes every 5 minutes

// Interim home page. The designed home page replaces it after its own review.
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

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-12">
        <p className="text-small font-semibold uppercase tracking-[0.2em] text-discovery">{t("home.eyebrow")}</p>
        <h1 className="mt-3 max-w-3xl font-display text-h1 leading-tight md:text-display rtl:font-sans rtl:font-bold">{t("home.title")}</h1>
        <p className="mt-4 max-w-xl text-h3 text-ink-muted">{t("home.subtitle")}</p>

        <h2 className="mt-14 text-h2 font-bold">{t("home.listTitle")}</h2>
        {cards.length === 0 ? (
          <p className="mt-4 text-ink-muted">{t("home.empty")}</p>
        ) : (
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((c) => (
              <li key={c.slug}>
                <Link href={`/experiences/${c.slug}`} className="group flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface hover:border-discovery">
                  <div className="h-40 bg-[#CBD3F7]" aria-hidden="true" />
                  <div className="flex flex-1 flex-col gap-2 p-5">
                    {c.category && <span className="text-small font-semibold text-discovery">{t(`categories.${c.category}` as "categories.sea")}</span>}
                    <span className="text-h3 font-bold leading-snug group-hover:text-discovery">{c.title}</span>
                    {c.summary && <span className="text-ink-muted">{c.summary}</span>}
                    {c.from_minor != null && (
                      <span className="mt-auto pt-2 font-semibold">{t("home.from", { price: formatMoney({ minor: c.from_minor, currency: c.currency }, locale) })}</span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
