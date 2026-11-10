import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { rpc } from "@/lib/data/rpc";
import type { ExperienceCard } from "@/lib/data/types";
import { formatMoney } from "@/lib/money";
import { requireWorkspace } from "@/lib/workspaces";
import { Empty, PageTitle, btn } from "@/components/ui";
import { CATEGORIES, cardImages } from "@/lib/catalog";
import { mediaSrc } from "@/lib/media";
import { ListFilter } from "@/components/ListFilter";
import { IconCategory } from "@/components/Icons";

export const dynamic = "force-dynamic";

/** Agency counter: pick an experience, then book through the normal page with the agency attached. */
export default async function AgencyBook({ params }: { params: Promise<{ locale: string; org: string }> }) {
  const { locale, org } = await params;
  setRequestLocale(locale);
  const ws = await requireWorkspace(locale, org, ["agency"]);
  if (ws.type !== "agency") notFound();
  const t = await getTranslations("app.agency");
  const tf = await getTranslations("app.filter");
  const tcat = await getTranslations("categories");
  const list = await rpc<ExperienceCard[]>("experience_list", { p_locale: locale }, "anon").catch(() => [] as ExperienceCard[]);

  return (
    <>
      <PageTitle title={t("title")} sub={t("sub")} />
      {ws.status !== "active" ? <Empty>{t("notActive")}</Empty> : list.length === 0 ? <Empty>{t("none")}</Empty> : (
        <>
        <ListFilter target="book-list"
          chips={CATEGORIES.map((k) => ({ value: k, label: tcat(k), icon: k, count: list.filter((c) => c.category === k).length }))}
          labels={{ search: tf("search"), all: tf("all"), clear: tf("clear"), results: tf.raw("shown") as string, none: tf("none"), group: tf("group") }} />
        <ul id="book-list" className="grid gap-3 md:grid-cols-2">
          {list.map((e) => (
            <li key={e.slug} data-filter-item data-group={e.category ?? ""} data-text={`${e.title ?? ""} ${e.summary ?? ""} ${e.category ? tcat(e.category as "sea") : ""}`}
              className="flex items-center justify-between gap-3 rounded-card border border-line bg-surface p-3">
              <div className="flex min-w-0 items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {cardImages(e)[0] ? <img src={mediaSrc(cardImages(e)[0], { w: 128, h: 128 })} alt="" loading="lazy" className="size-16 shrink-0 rounded-[12px] object-cover" />
                  : <span className="grid size-16 shrink-0 place-items-center rounded-[12px] bg-aqua-tint"><IconCategory name={e.category ?? "sea"} size={22} /></span>}
                <div className="min-w-0">
                  <div className="line-clamp-2 font-bold">{e.title}</div>
                  <div className="text-small text-ink-muted">{e.category ? tcat(e.category as "sea") : ""}{e.from_minor != null && <> · {t("from", { price: formatMoney({ minor: e.from_minor, currency: e.currency }, locale) })}</>}</div>
                </div>
              </div>
              <Link href={{ pathname: `/experiences/${e.slug}`, query: { ag: org } }} className={btn.primary}>{t("book")}</Link>
            </li>
          ))}
        </ul>
        </>
      )}
      <p className="mt-8 text-small text-ink-muted">{t("note")}</p>
    </>
  );
}
