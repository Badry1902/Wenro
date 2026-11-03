import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { rpc } from "@/lib/data/rpc";
import { formatMoney } from "@/lib/money";
import { requirePlatform } from "@/lib/workspaces";
import { Badge, Empty, PageTitle, btn } from "@/components/ui";
import { Submit } from "@/components/Submit";
import { markStatementReceived } from "../../../actions";

export const dynamic = "force-dynamic";

type Trip = { ref: string; starts_at: string; title: string | null; seats: number; source: string; operator?: string; currency?: string; paid_minor: number; operator_net_minor: number; due_minor: number };
type Dues = {
  statements: { id: string; operator: string; currency: string; period_start: string; period_end: string; collected_minor: number; due_minor: number; status: string; trips: Trip[] }[];
  unsettled: (Trip & { operator: string; currency: string })[];
};

/** "Owed by operators": every open statement with the trips behind it, then trips done but not on a statement yet. */
export default async function OperatorDues({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePlatform(locale, "finance");
  const t = await getTranslations("app.dues");
  const tf = await getTranslations("app.finance");
  const format = await getFormatter();
  const f = await rpc<Dues>("admin_operator_dues", {}, "user");
  const m = (minor: number, c: string) => formatMoney({ minor: Number(minor), currency: c as "EUR" }, locale);
  const day = (iso: string) => format.dateTime(new Date(iso), { day: "numeric", month: "short", timeZone: "Africa/Cairo" });
  const d = (iso: string) => format.dateTime(new Date(`${iso.slice(0, 10)}T12:00:00Z`), { day: "numeric", month: "short", year: "numeric" });
  const hidden = (<><input type="hidden" name="locale" value={locale} /><input type="hidden" name="back" value="/app/admin/finance/operators" /></>);

  // unsettled trips grouped by operator
  const groups = new Map<string, Dues["unsettled"]>();
  for (const r of f.unsettled) groups.set(`${r.operator}|${r.currency}`, [...(groups.get(`${r.operator}|${r.currency}`) ?? []), r]);

  const Table = ({ trips, currency }: { trips: Trip[]; currency: string }) => (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-small">
        <thead className="text-start text-ink-muted">
          <tr className="border-b border-line">
            <th className="p-2 text-start font-semibold">{t("trip")}</th>
            <th className="p-2 text-start font-semibold">{t("date")}</th>
            <th className="p-2 text-end font-semibold">{t("collected")}</th>
            <th className="p-2 text-end font-semibold">{t("operatorKeeps")}</th>
            <th className="p-2 text-end font-semibold">{t("toWenro")}</th>
          </tr>
        </thead>
        <tbody>
          {trips.map((r) => (
            <tr key={r.ref} className="border-b border-line last:border-0">
              <td className="p-2"><span className="font-semibold">{r.title ?? "—"}</span><br /><span className="text-ink-muted" dir="ltr">{r.ref}</span> · {t("seats", { n: r.seats })} · {t(`source.${r.source}` as "source.direct")}</td>
              <td className="p-2 whitespace-nowrap">{day(r.starts_at)}</td>
              <td className="p-2 text-end tabular-nums">{m(r.paid_minor, currency)}</td>
              <td className="p-2 text-end tabular-nums">{m(r.operator_net_minor, currency)}</td>
              <td className="p-2 text-end font-bold tabular-nums">{m(r.due_minor, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <PageTitle title={t("operatorsTitle")} sub={t("operatorsSub")} actions={<Link href="/app/admin/finance" className={btn.quiet}>{t("backToFinance")}</Link>} />

      <section className="mb-10">
        <h2 className="mb-3 text-h3 font-bold">{t("openStatements")}</h2>
        {f.statements.length === 0 ? <Empty>{tf("statementsNone")}</Empty> : (
          <div className="flex flex-col gap-4">
            {f.statements.map((s) => (
              <details key={s.id} className="group rounded-card border border-line" open={f.statements.length <= 2 && s.trips.length <= 15}>
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
                  <span>
                    <span className="flex flex-wrap items-center gap-2 font-bold">{s.operator}<Badge value={s.status} /></span>
                    <span className="text-small text-ink-muted">{d(s.period_start)} – {d(s.period_end)} · {tf("trips", { n: s.trips.length })} · {tf("collected")}: {m(s.collected_minor, s.currency)}</span>
                  </span>
                  <span className="text-h3 font-bold tabular-nums">{m(s.due_minor, s.currency)}</span>
                </summary>
                <div className="border-t border-line p-2 md:p-4">
                  <Table trips={s.trips} currency={s.currency} />
                  <form action={markStatementReceived} className="mt-3 flex justify-end">{hidden}<input type="hidden" name="statement" value={s.id} /><Submit className={btn.primary}>{tf("markReceived")}</Submit></form>
                </div>
              </details>
            ))}
          </div>
        )}
      </section>

      <section id="unsettled">
        <h2 className="mb-1 text-h3 font-bold">{tf("unsettledTitle")}</h2>
        <p className="mb-3 text-small text-ink-muted">{t("unsettledHint")}</p>
        {groups.size === 0 ? <Empty>{tf("unsettledNone")}</Empty> : (
          <div className="flex flex-col gap-4">
            {[...groups.entries()].map(([k, trips]) => (
              <div key={k} className="rounded-card border border-line">
                <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <span className="font-bold">{trips[0].operator}</span>
                  <span className="tabular-nums">{tf("tripsDue", { n: trips.length })} <b>{m(trips.reduce((a, r) => a + Number(r.due_minor), 0), trips[0].currency)}</b></span>
                </div>
                <div className="border-t border-line p-2 md:p-4"><Table trips={trips} currency={trips[0].currency} /></div>
              </div>
            ))}
            <Link href="/app/admin/finance#unsettled" className={`${btn.secondary} self-start`}>{t("makeStatements")}</Link>
          </div>
        )}
      </section>
    </>
  );
}
