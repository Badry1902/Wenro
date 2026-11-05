import { notFound } from "next/navigation";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { rpc } from "@/lib/data/rpc";
import { requireWorkspace } from "@/lib/workspaces";
import { isOrgManager } from "@/lib/permissions";
import { Empty, PageTitle } from "@/components/ui";
import { Stars } from "@/components/site/Reviews";

export const dynamic = "force-dynamic";

type Row = { rating: number; body: string | null; author: string | null; created_at: string; title: string | null; ref: string };

/** Operator owners and managers: what guests said about their trips (published reviews). */
export default async function OperatorReviews({ params }: { params: Promise<{ locale: string; org: string }> }) {
  const { locale, org } = await params;
  setRequestLocale(locale);
  const ws = await requireWorkspace(locale, org, ["operator"]);
  if (!isOrgManager(ws)) notFound();
  const t = await getTranslations("app.reviews");
  const format = await getFormatter();
  const rows = await rpc<Row[]>("operator_reviews", { p_operator: org }, "user").catch(() => [] as Row[]);
  const avg = rows.length ? rows.reduce((a, r) => a + r.rating, 0) / rows.length : 0;

  return (
    <>
      <PageTitle title={t("opTitle")} sub={t("opSub")} />
      {rows.length > 0 && (
        <div className="mb-6 inline-flex items-center gap-3 rounded-card bg-apricot-tint px-5 py-3">
          <span className="text-[32px] font-extrabold tabular-nums">{avg.toFixed(1)}</span><Stars value={avg} size={18} />
          <span className="text-small text-ink-muted">{t("count", { n: rows.length })}</span>
        </div>
      )}
      {rows.length === 0 ? <Empty>{t("opNone")}</Empty> : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.ref} className="flex flex-col gap-1.5 rounded-card border border-line p-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><span className="flex items-center gap-2"><Stars value={r.rating} /><b>{r.author ?? "—"}</b></span>
                <span className="text-small text-ink-muted">{format.dateTime(new Date(r.created_at), { day: "numeric", month: "short", year: "numeric" })}</span></div>
              <div className="text-small text-ink-muted">{r.title} · <span dir="ltr">{r.ref}</span></div>
              {r.body && <p className="whitespace-pre-line">{r.body}</p>}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
