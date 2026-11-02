import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { rpc } from "@/lib/data/rpc";
import type { ExperienceCard } from "@/lib/data/types";
import { formatMoney } from "@/lib/money";
import { requireWorkspace } from "@/lib/workspaces";
import { Empty, PageTitle, btn } from "@/components/ui";

export const dynamic = "force-dynamic";

/** Agency counter: pick an experience, then book through the normal page with the agency attached. */
export default async function AgencyBook({ params }: { params: Promise<{ locale: string; org: string }> }) {
  const { locale, org } = await params;
  setRequestLocale(locale);
  const ws = await requireWorkspace(locale, org, ["agency"]);
  if (ws.type !== "agency") notFound();
  const t = await getTranslations("app.agency");
  const list = await rpc<ExperienceCard[]>("experience_list", { p_locale: locale }, "anon").catch(() => [] as ExperienceCard[]);

  return (
    <>
      <PageTitle title={t("title")} sub={t("sub")} />
      {ws.status !== "active" ? <Empty>{t("notActive")}</Empty> : list.length === 0 ? <Empty>{t("none")}</Empty> : (
        <ul className="grid gap-3 md:grid-cols-2">
          {list.map((e) => (
            <li key={e.slug} className="flex flex-col justify-between gap-3 rounded-card border border-line p-4">
              <div>
                <div className="font-bold">{e.title}</div>
                {e.from_minor != null && <div className="text-small text-ink-muted">{t("from", { price: formatMoney({ minor: e.from_minor, currency: e.currency }, locale) })}</div>}
              </div>
              <Link href={{ pathname: `/experiences/${e.slug}`, query: { ag: org } }} className={btn.primary}>{t("book")}</Link>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-8 text-small text-ink-muted">{t("note")}</p>
    </>
  );
}
