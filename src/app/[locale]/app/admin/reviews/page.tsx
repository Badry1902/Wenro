import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { rpc } from "@/lib/data/rpc";
import { requirePlatform } from "@/lib/workspaces";
import { Badge, Empty, Flash, PageTitle, btn } from "@/components/ui";
import { Submit } from "@/components/Submit";
import { Stars } from "@/components/site/Reviews";
import { moderateReview } from "../../actions";

export const dynamic = "force-dynamic";

type Row = { id: string; rating: number; body: string | null; author: string | null; locale: string; created_at: string; ref: string;
  trip_date: string; title: string | null; slug: string; operator: string; status: "pending" | "published" | "hidden" };
type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ ok?: string; err?: string; s?: string }> };
const TABS = ["pending", "published", "hidden"] as const;

/** Guest reviews: publish real, relevant ones; hide abuse, personal data or off-topic text. Never edit them. */
export default async function AdminReviews({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const q = await searchParams;
  await requirePlatform(locale, "reviews");
  const t = await getTranslations("app.reviews");
  const format = await getFormatter();
  const tab = TABS.includes(q.s as (typeof TABS)[number]) ? (q.s as (typeof TABS)[number]) : "pending";
  const rows = await rpc<Row[]>("admin_reviews", { p_status: tab }, "user").catch(() => [] as Row[]);
  const back = "/app/admin/reviews";

  return (
    <>
      <PageTitle title={t("title")} sub={t("sub")} />
      <Flash ok={q.ok} err={q.err} />
      <nav className="mb-5 flex flex-wrap gap-2" aria-label={t("title")}>
        {TABS.map((s) => (
          <Link key={s} href={{ pathname: back, query: { s } }} aria-current={s === tab ? "page" : undefined}
            className={`${s === tab ? btn.primary : btn.quiet} min-h-10 text-small`}>{t(`tab.${s}`)}</Link>
        ))}
      </nav>
      {rows.length === 0 ? <Empty>{t(`none.${tab}`)}</Empty> : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-col gap-2 rounded-card border border-line p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex flex-wrap items-center gap-2"><Stars value={r.rating} /><b>{r.author ?? "—"}</b><Badge value={r.status} /></span>
                <span className="text-small text-ink-muted">{format.dateTime(new Date(r.created_at), { day: "numeric", month: "short", year: "numeric" })}</span>
              </div>
              <div className="text-small text-ink-muted">
                <Link href={`/experiences/${r.slug}`} className="font-semibold text-discovery hover:underline">{r.title}</Link> · {r.operator} · <span dir="ltr">{r.ref}</span> · {t("tripOn", { date: format.dateTime(new Date(r.trip_date), { day: "numeric", month: "short" }) })}
              </div>
              {r.body ? <p className="whitespace-pre-line" lang={r.locale}>{r.body}</p> : <p className="text-small italic text-ink-muted">{t("noText")}</p>}
              <div className="flex flex-wrap gap-2">
                {r.status !== "published" && (
                  <form action={moderateReview}><input type="hidden" name="locale" value={locale} /><input type="hidden" name="back" value={back} /><input type="hidden" name="keep" value={`s=${tab}`} />
                    <input type="hidden" name="review" value={r.id} /><input type="hidden" name="slug" value={r.slug} /><input type="hidden" name="publish" value="1" />
                    <Submit className={btn.primary}>{t("publish")}</Submit></form>
                )}
                {r.status !== "hidden" && (
                  <form action={moderateReview}><input type="hidden" name="locale" value={locale} /><input type="hidden" name="back" value={back} /><input type="hidden" name="keep" value={`s=${tab}`} />
                    <input type="hidden" name="review" value={r.id} /><input type="hidden" name="slug" value={r.slug} /><input type="hidden" name="publish" value="0" />
                    <Submit className={btn.quiet}>{t("hide")}</Submit></form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-8 rounded-card bg-warning-tint p-4 text-small text-warning">{t("rules")}</p>
    </>
  );
}
