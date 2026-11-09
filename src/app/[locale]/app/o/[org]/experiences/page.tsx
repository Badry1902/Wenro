import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { QualityBadge } from "@/components/growth/QualityBadge";
import type { TripQuality } from "@/lib/quality";
import { Link } from "@/i18n/navigation";
import { rpc } from "@/lib/data/rpc";
import { canManage, requireWorkspace } from "@/lib/workspaces";
import { Badge, Empty, Flash, PageTitle, btn } from "@/components/ui";
import { Submit } from "@/components/Submit";
import { setExperienceStatus } from "../../../actions";

export const dynamic = "force-dynamic";

type OpExperience = { id: string; slug: string; status: string; booking_mode: string; title: string };
type Props = { params: Promise<{ locale: string; org: string }>; searchParams: Promise<{ ok?: string; err?: string }> };

export default async function OperatorExperiences({ params, searchParams }: Props) {
  const { locale, org } = await params;
  setRequestLocale(locale);
  const q = await searchParams;
  const ws = await requireWorkspace(locale, org, ["operator"]);
  if (!canManage(ws)) notFound();
  const t = await getTranslations("app.exp");
  const [list, quality] = await Promise.all([
    rpc<OpExperience[]>("operator_experiences", { p_operator: org }, "user"),
    rpc<TripQuality[]>("operator_trip_quality", { p_operator: org }, "user").catch(() => [] as TripQuality[]),
  ]);
  const back = `/app/o/${org}/experiences`;
  const hidden = (<><input type="hidden" name="locale" value={locale} /><input type="hidden" name="back" value={back} /></>);

  return (
    <>
      <PageTitle title={t("title")} sub={t("sub")} actions={<Link href={`/app/o/${org}/experiences/new`} className={btn.primary}>+ {t("new")}</Link>} />
      <Flash ok={q.ok} err={q.err} />
      {list.length === 0 ? <Empty>{t("none")}</Empty> : (
        <ul className="flex flex-col gap-3">
          {list.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line p-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 font-bold">{e.title}<Badge value={e.status} /></div>
                <div className="text-small text-ink-muted">{t(e.booking_mode === "instant" ? "instant" : "request")}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/app/o/${org}/experiences/${e.id}`} className={btn.secondary}>{t("edit")}</Link>
                {e.status === "published" && <Link href={`/experiences/${e.slug}`} className={btn.quiet}>{t("view")}</Link>}
                {e.status === "draft" && (
                  <form action={setExperienceStatus}>{hidden}<input type="hidden" name="experience" value={e.id} /><input type="hidden" name="status" value="in_review" /><Submit className={btn.primary}>{t("submit")}</Submit></form>
                )}
                {e.status === "in_review" && (
                  <form action={setExperienceStatus}>{hidden}<input type="hidden" name="experience" value={e.id} /><input type="hidden" name="status" value="draft" /><Submit className={btn.quiet}>{t("withdraw")}</Submit></form>
                )}
              </div>
              {quality.find((x) => x.id === e.id) && <QualityBadge q={quality.find((x) => x.id === e.id)!} editHref={`/app/o/${org}/experiences/${e.id}`} />}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-8 text-small text-ink-muted">{t("editorNote")}</p>
    </>
  );
}
