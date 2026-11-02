import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { rpc } from "@/lib/data/rpc";
import type { ExperienceCard } from "@/lib/data/types";
import { formatMoney } from "@/lib/money";
import { mediaSrc, videoPoster } from "@/lib/media";
import { SiteHeader } from "@/components/SiteHeader";
import { IconClock } from "@/components/Icons";

export const revalidate = 300; // list refreshes every 5 minutes

const ORDER = ["sea", "desert", "culture"];

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
  const groups = ORDER.map((c) => ({ c, items: cards.filter((x) => x.category === c) }))
    .concat([{ c: "other", items: cards.filter((x) => !ORDER.includes(x.category ?? "")) }])
    .filter((g) => g.items.length > 0);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-12">
        <div className="hero-in">
          <p className="text-small font-semibold uppercase tracking-[0.2em] text-discovery">{t("home.eyebrow")}</p>
          <h1 className="mt-3 max-w-3xl font-display text-h1 leading-tight md:text-display rtl:font-sans rtl:font-bold">{t("home.title")}</h1>
          <p className="mt-4 max-w-xl text-h3 text-ink-muted">{t("home.subtitle")}</p>
          {groups.length > 1 && (
            <nav aria-label={t("home.listTitle")} className="mt-8 flex flex-wrap gap-2">
              {groups.map((g) => (
                <a key={g.c} href={`#${g.c}`} className="btn-press chip-link inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-5 font-semibold">
                  {g.c === "other" ? t("home.more") : t(`categories.${g.c}` as "categories.sea")} <span className="ms-2 text-small text-ink-muted">{g.items.length}</span>
                </a>
              ))}
            </nav>
          )}
        </div>

        {cards.length === 0 && <p className="mt-14 text-ink-muted">{t("home.empty")}</p>}
        {groups.map((g) => (
          <section key={g.c} id={g.c} aria-labelledby={`h-${g.c}`} className="mt-14 scroll-mt-6">
            <h2 id={`h-${g.c}`} className="text-h2 font-bold">{g.c === "other" ? t("home.more") : t(`categories.${g.c}` as "categories.sea")}</h2>
            <ul className="stagger mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map((c) => (
                <li key={c.slug}>
                  <Link href={`/experiences/${c.slug}`} className="card-lift group flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface">
                    <div className="relative aspect-[4/3] overflow-hidden bg-[#CBD3F7]">
                      {c.cover && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.cover.kind === "video" ? (videoPoster(c.cover.path, { w: 640, h: 480 }) ?? c.cover.path) : mediaSrc(c.cover.path, { w: 640, h: 480 })} alt={c.cover.alt ?? ""} loading="lazy" className="card-img h-full w-full object-cover" />
                      )}
                      {c.slug.startsWith("demo-") && (
                        <span className="absolute start-3 top-3 rounded-full bg-ink/85 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white">{t("home.demoTag")}</span>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-5">
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-ink-muted">
                        {c.duration_minutes && (
                          <span className="inline-flex items-center gap-1"><IconClock size={14} />{c.duration_minutes >= 60 ? t("experience.hours", { n: Math.round((c.duration_minutes / 60) * 2) / 2 }) : t("experience.minutes", { n: c.duration_minutes })}</span>
                        )}
                        <span>{c.booking_mode === "request" ? t("experience.onRequest") : t("experience.instant")}</span>
                      </span>
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
          </section>
        ))}
      </main>
    </>
  );
}
