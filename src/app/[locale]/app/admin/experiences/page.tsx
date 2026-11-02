import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { rpc } from "@/lib/data/rpc";
import { requirePlatform } from "@/lib/workspaces";
import { Badge, Empty, Flash, PageTitle, btn } from "@/components/ui";
import { setExperienceStatus } from "../../actions";

export const dynamic = "force-dynamic";

type Exp = {
  id: string; slug: string; status: string; operator: string; operator_status: string; booking_mode: string;
  title: string; locales: string[] | null; upcoming_slots: number;
};
type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ ok?: string; err?: string }> };

export default async function AdminExperiences({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const q = await searchParams;
  await requirePlatform(locale);
  const t = await getTranslations("app.adminExp");
  const te = await getTranslations("app.exp");
  const list = await rpc<Exp[]>("admin_experiences", {}, "user");
  const order = { in_review: 0, published: 1, draft: 2, archived: 3 } as Record<string, number>;
  list.sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));
  const back = "/app/admin/experiences";
  const hidden = (<><input type="hidden" name="locale" value={locale} /><input type="hidden" name="back" value={back} /></>);
  const to = (e: Exp, status: string, label: string, style: string) => (
    <form action={setExperienceStatus}>{hidden}<input type="hidden" name="experience" value={e.id} /><input type="hidden" name="status" value={status} /><button className={style}>{label}</button></form>
  );

  return (
    <>
      <PageTitle title={t("title")} sub={t("sub")} />
      <Flash ok={q.ok} err={q.err} />
      {list.length === 0 ? <Empty>{t("none")}</Empty> : (
        <ul className="flex flex-col gap-3">
          {list.map((e) => (
            <li key={e.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-card border p-4 ${e.status === "in_review" ? "border-apricot bg-apricot-tint" : "border-line"}`}>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 font-bold">{e.title}<Badge value={e.status} /></div>
                <div className="text-small text-ink-muted">
                  {e.operator}{e.operator_status !== "active" && <> · <b className="text-critical">{t("operatorNotActive")}</b></>}
                  {" · "}{te(e.booking_mode === "instant" ? "instant" : "request")}
                  {" · "}{t("languages")}: <span dir="ltr">{(e.locales ?? []).join(", ").toUpperCase() || "—"}</span>
                  {" · "}{t("upcoming", { n: e.upcoming_slots })}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {e.status === "published" && <Link href={`/experiences/${e.slug}`} className={btn.quiet}>{te("view")}</Link>}
                {e.status !== "published" && e.status !== "archived" && to(e, "published", t("publish"), btn.primary)}
                {e.status === "in_review" && to(e, "draft", t("sendBack"), btn.quiet)}
                {e.status === "published" && to(e, "draft", t("unpublish"), btn.quiet)}
                {e.status !== "archived" && e.status !== "published" && to(e, "archived", t("archive"), btn.quiet)}
                {e.status === "archived" && to(e, "draft", t("restore"), btn.quiet)}
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-8 text-small text-ink-muted">{t("note")}</p>
    </>
  );
}
