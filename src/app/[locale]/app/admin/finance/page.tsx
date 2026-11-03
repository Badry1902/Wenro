import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { rpc } from "@/lib/data/rpc";
import { formatMoney } from "@/lib/money";
import { dayKey } from "@/lib/pricing";
import { requirePlatform } from "@/lib/workspaces";
import { Badge, Card, Empty, Flash, PageTitle, btn, field } from "@/components/ui";
import { Submit } from "@/components/Submit";
import { createPayouts, generateStatements, markPayoutPaid, markStatementReceived } from "../../actions";

export const dynamic = "force-dynamic";

type Finance = {
  statements: { id: string; operator: string; currency: string; period_start: string; period_end: string; bookings_count: number; collected_minor: number; due_minor: number; status: string; received_at: string | null }[];
  payouts: { id: string; partner: string; partner_type: string; instapay: string | null; currency: string; period_month: string; amount_minor: number; status: string; reference: string | null; paid_at: string | null }[];
  unsettled: { operator: string; currency: string; count: number; due_minor: number }[];
};
type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ ok?: string; err?: string }> };

export default async function AdminFinance({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const q = await searchParams;
  await requirePlatform(locale, "finance");
  const t = await getTranslations("app.finance");
  const tt = await getTranslations("app.types");
  const td = await getTranslations("app.dues");
  const format = await getFormatter();
  const f = await rpc<Finance>("finance_overview", {}, "user");
  const back = "/app/admin/finance";
  const hidden = (<><input type="hidden" name="locale" value={locale} /><input type="hidden" name="back" value={back} /></>);
  const m = (minor: number, c: string) => formatMoney({ minor: Number(minor), currency: c as "EUR" }, locale);
  const d = (iso: string) => format.dateTime(new Date(`${iso.slice(0, 10)}T12:00:00Z`), { day: "numeric", month: "short", year: "numeric" });

  // Defaults: last calendar month for statements; this month for payouts.
  const today = dayKey(new Date().toISOString()); // Hurghada calendar day
  const [y, mo] = today.split("-").map(Number);
  const lastStart = new Date(Date.UTC(y, mo - 2, 1)).toISOString().slice(0, 10);
  const lastEnd = new Date(Date.UTC(y, mo - 1, 0)).toISOString().slice(0, 10);
  const thisMonth = today.slice(0, 7);

  return (
    <>
      <PageTitle title={t("title")} sub={t("sub")} />
      <Flash ok={q.ok} err={q.err} />

      <ol className="mb-8 grid gap-3 text-small md:grid-cols-4">
        {(["step1", "step2", "step3", "step4"] as const).map((s, i) => (
          <li key={s} className="rounded-card border border-line p-3"><b className="me-1 text-discovery">{i + 1}.</b>{t(s)}</li>
        ))}
      </ol>

      <nav className="mb-8 grid gap-3 md:grid-cols-2" aria-label={td("drill")}>
        <Link href="/app/admin/finance/operators" className="rounded-card border border-line p-4 font-bold hover:border-discovery hover:bg-discovery-tint">{td("operatorsTitle")} <span className="block text-small font-normal text-ink-muted">{td("operatorsSub")}</span></Link>
        <Link href="/app/admin/finance/partners" className="rounded-card border border-line p-4 font-bold hover:border-discovery hover:bg-discovery-tint">{td("partnersTitle")} <span className="block text-small font-normal text-ink-muted">{td("partnersSub")}</span></Link>
      </nav>

      <section id="unsettled" className="mb-8">
        <h2 className="mb-3 text-h3 font-bold">{t("unsettledTitle")}</h2>
        {f.unsettled.length === 0 ? <Empty>{t("unsettledNone")}</Empty> : (
          <ul className="mb-4 divide-y divide-line rounded-card border border-line">
            {f.unsettled.map((u) => (
              <li key={u.operator + u.currency} className="flex flex-wrap justify-between gap-2 p-3">
                <span className="font-semibold">{u.operator}</span>
                <span className="tabular-nums">{t("tripsDue", { n: u.count })} <b>{m(u.due_minor, u.currency)}</b></span>
              </li>
            ))}
          </ul>
        )}
        <Card title={t("generateTitle")}>
          <form action={generateStatements} className="flex flex-wrap items-end gap-3">
            {hidden}
            <label className="flex flex-col gap-1 text-small font-bold">{t("from")}<input type="date" name="from" required defaultValue={lastStart} className={field} /></label>
            <label className="flex flex-col gap-1 text-small font-bold">{t("to")}<input type="date" name="to" required defaultValue={lastEnd} max={today} className={field} /></label>
            <Submit className={btn.primary}>{t("generate")}</Submit>
          </form>
          <p className="mt-2 text-small text-ink-muted">{t("generateHint")}</p>
        </Card>
      </section>

      <section id="statements" className="mb-8">
        <h2 className="mb-3 text-h3 font-bold">{t("statementsTitle")}</h2>
        {f.statements.length === 0 ? <Empty>{t("statementsNone")}</Empty> : (
          <ul className="flex flex-col gap-2">
            {f.statements.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line p-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 font-bold">{s.operator}<Badge value={s.status} /></div>
                  <div className="text-small text-ink-muted">{d(s.period_start)} – {d(s.period_end)} · {t("trips", { n: s.bookings_count })} · {t("collected")}: {m(s.collected_minor, s.currency)}</div>
                  <div className="font-semibold tabular-nums">{t("due")}: {m(s.due_minor, s.currency)}</div>
                </div>
                {s.status === "open" && (
                  <form action={markStatementReceived}>{hidden}<input type="hidden" name="statement" value={s.id} /><Submit className={btn.primary}>{t("markReceived")}</Submit></form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="payouts">
        <h2 className="mb-3 text-h3 font-bold">{t("payoutsTitle")}</h2>
        <Card className="mb-4">
          <form action={createPayouts} className="flex flex-wrap items-end gap-3">
            {hidden}
            <input type="hidden" name="month" value={`${thisMonth}-01`} />
            <p className="flex-1 text-small">{t("createPayoutsHint", { month: format.dateTime(new Date(`${thisMonth}-15T12:00:00Z`), { month: "long", year: "numeric" }) })}</p>
            <Submit className={btn.primary}>{t("createPayouts")}</Submit>
          </form>
        </Card>
        {f.payouts.length === 0 ? <Empty>{t("payoutsNone")}</Empty> : (
          <ul className="flex flex-col gap-2">
            {f.payouts.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line p-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 font-bold">{p.partner}<Badge value={p.status} /><span className="text-small font-semibold text-ink-muted">{tt(p.partner_type)}</span></div>
                  <div className="text-small text-ink-muted">
                    {format.dateTime(new Date(`${p.period_month.slice(0, 10)}T12:00:00Z`), { month: "long", year: "numeric" })} · InstaPay: <span dir="ltr">{p.instapay ?? t("noInstapay")}</span>
                    {p.reference && <> · {t("reference")}: <span dir="ltr">{p.reference}</span></>}
                  </div>
                  <div className="font-semibold tabular-nums">{m(p.amount_minor, p.currency)}</div>
                </div>
                {p.status === "pending" && (
                  <form action={markPayoutPaid} className="flex flex-wrap items-end gap-2">
                    {hidden}<input type="hidden" name="payout" value={p.id} />
                    <label className="flex flex-col gap-1 text-small font-bold">{t("reference")}<input name="reference" required maxLength={80} dir="ltr" className={`${field} w-44`} /></label>
                    <Submit className={btn.primary}>{t("markPaid")}</Submit>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="mt-8 rounded-card bg-warning-tint p-4 text-small text-warning">{t("legalNote")}</p>
    </>
  );
}
