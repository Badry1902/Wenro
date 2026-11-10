import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { rpc } from "@/lib/data/rpc";
import { formatMoney } from "@/lib/money";
import { dayKey } from "@/lib/pricing";
import { requirePlatform } from "@/lib/workspaces";
import { Badge, Card, Empty, Flash, PageTitle, btn, field } from "@/components/ui";
import { Submit } from "@/components/Submit";
import { createPayouts, generateStatements, markPayoutPaid } from "../../actions";
import { reviewPayment, savePaymentMethod } from "../../payment-actions";

export const dynamic = "force-dynamic";

type Cur = "EUR" | "USD" | "EGP";
type Totals = { guests_paid_month: number; wenro_share_month: number; operators_owe: number; received_month: number; in_review: number; partners_owed: number; partners_ready: number; paid_partners_month: number };
type Dash = {
  month: string;
  totals: Record<string, Totals>;
  operators: { id: string; name: string; status: string; currency: Cur; unsettled_trips: number; unsettled_minor: number; open_statements: number; open_minor: number; owe: number; in_review: number; last_received: string | null }[];
  partners: { id: string; name: string; type: string; instapay: string | null; currency: Cur; waiting: number | null; earned: number | null; ready: number | null; paid: number | null; owed: number }[];
  movements: { at: string; type: string; org: string | null; currency: Cur; amount_minor: number; memo: string | null }[];
  review_count: number;
};
type Overview = {
  statements: { id: string; operator: string; currency: string; period_start: string; period_end: string; bookings_count: number; collected_minor: number; due_minor: number; status: string; received_at: string | null }[];
  payouts: { id: string; partner: string; partner_type: string; instapay: string | null; currency: string; period_month: string; amount_minor: number; status: string; reference: string | null; paid_at: string | null }[];
};
type Payment = { id: string; operator: string; currency: Cur; amount_minor: number; method: string; reference: string | null; note: string | null; status: string; created_at: string; reviewed_at: string | null; review_note: string | null; proof_kind: "pdf" | "image"; statements: { period_start: string; period_end: string; due_minor: number; bookings_count: number; status: string }[] | null };
type Method = { id: string; kind: "instapay" | "bank" | "wallet" | "link"; label: string; account_name: string | null; value: string; extra: string | null; pay_url: string | null; sort: number; active: boolean };
type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ ok?: string; err?: string; tab?: string }> };

const TABS = ["overview", "operators", "partners", "review", "methods", "history"] as const;
type Tab = (typeof TABS)[number];

/**
 * WENRO accounts. One overview in plain words (who owes whom, what came in this month), then a tab for each job:
 * collect from operators, pay partners, check operator payments, set payment methods, see every movement.
 * Only the WENRO owner and finance team can open it (checked again by every database call).
 */
export default async function AdminFinance({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const q = await searchParams;
  await requirePlatform(locale, "finance");
  const tab: Tab = (TABS as readonly string[]).includes(q.tab ?? "") ? (q.tab as Tab) : "overview";
  const t = await getTranslations("app.acc");
  const tf = await getTranslations("app.finance");
  const tt = await getTranslations("app.types");
  const format = await getFormatter();
  const [dash, ov, payments, methods] = await Promise.all([
    rpc<Dash>("finance_dashboard", {}, "user").catch(() => null),
    tab === "partners" || tab === "history" || tab === "operators" ? rpc<Overview>("finance_overview", {}, "user") : Promise.resolve(null),
    tab === "review" ? rpc<Payment[]>("admin_operator_payments", { p_status: null }, "user").catch(() => [] as Payment[]) : Promise.resolve([] as Payment[]),
    tab === "methods" ? rpc<Method[]>("payment_methods_list", {}, "user").catch(() => [] as Method[]) : Promise.resolve([] as Method[]),
  ]);
  // Before the database update (wenro-db-update-5) the new accounts functions do not exist yet
  if (!dash) return (<><PageTitle title={t("title")} sub={t("sub")} /><p className="rounded-card bg-warning-tint p-4 text-warning">{t("needsUpdate")}</p></>);
  const m = (minor: number | null | undefined, c: string) => formatMoney({ minor: Number(minor ?? 0), currency: c as Cur }, locale);
  const d = (iso: string) => format.dateTime(new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso), { day: "numeric", month: "short", year: "numeric" });
  const monthName = format.dateTime(new Date(`${dash.month}T12:00:00Z`), { month: "long", year: "numeric" });
  const currencies = Object.keys(dash.totals).length ? Object.keys(dash.totals) : ["EUR"];
  const hidden = (back = "/app/admin/finance", keep = "") => (<><input type="hidden" name="locale" value={locale} /><input type="hidden" name="back" value={back} />{keep && <input type="hidden" name="keep" value={keep} />}</>);

  const today = dayKey(new Date().toISOString());
  const [y, mo] = today.split("-").map(Number);
  const lastStart = new Date(Date.UTC(y, mo - 2, 1)).toISOString().slice(0, 10);
  const lastEnd = new Date(Date.UTC(y, mo - 1, 0)).toISOString().slice(0, 10);
  const thisMonth = today.slice(0, 7);

  const unsettledOps = dash.operators.filter((o) => o.unsettled_trips > 0).length;
  const readyPartners = dash.partners.filter((p) => Number(p.ready ?? 0) > 0).length;
  const todo = [
    dash.review_count > 0 && { href: "?tab=review", text: t("todo.review", { n: dash.review_count }), tone: "warn" },
    unsettledOps > 0 && { href: "?tab=operators", text: t("todo.statements", { n: unsettledOps }), tone: "info" },
    readyPartners > 0 && { href: "?tab=partners", text: t("todo.payouts", { n: readyPartners }), tone: "info" },
  ].filter(Boolean) as { href: string; text: string; tone: string }[];

  const Tile = ({ label, value, hint, tone = "plain" }: { label: string; value: string; hint?: string; tone?: "plain" | "in" | "out" | "wenro" }) => (
    <div className={`rounded-card border p-4 ${tone === "in" ? "border-success/40 bg-success-tint" : tone === "out" ? "border-apricot/50 bg-apricot-tint" : tone === "wenro" ? "border-discovery/30 bg-discovery-tint" : "border-line bg-surface"}`}>
      <div className="text-small font-semibold text-ink-muted">{label}</div>
      <div className="mt-1 text-[24px] font-extrabold leading-tight tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-small text-ink-muted">{hint}</div>}
    </div>
  );
  const th = "px-3 py-2 text-start text-small font-semibold text-ink-muted";
  const td = "px-3 py-2.5 align-top";

  return (
    <>
      <PageTitle title={t("title")} sub={t("sub")} />
      <Flash ok={q.ok} err={q.err} />

      <nav className="rail -mx-1 mb-6 flex gap-1 overflow-x-auto border-b border-line px-1" aria-label={t("title")}>
        {TABS.map((k) => (
          <Link key={k} href={k === "overview" ? "/app/admin/finance" : `/app/admin/finance?tab=${k}`} aria-current={k === tab ? "page" : undefined}
            className={`-mb-px inline-flex min-h-11 shrink-0 items-center gap-1.5 border-b-2 px-3 text-[15px] font-semibold ${k === tab ? "border-discovery text-discovery" : "border-transparent text-ink-muted hover:text-ink"}`}>
            {t(`tabs.${k}`)}
            {k === "review" && dash.review_count > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-apricot px-1 text-[11px] font-bold leading-5 text-ink">{dash.review_count}</span>}
          </Link>
        ))}
      </nav>

      {tab === "overview" && (
        <>
          {todo.length > 0 && (
            <ul className="mb-6 flex flex-col gap-2">
              {todo.map((x) => (
                <li key={x.href}><a href={x.href} className={`flex min-h-12 items-center justify-between gap-3 rounded-card border px-4 font-semibold ${x.tone === "warn" ? "border-apricot bg-apricot-tint" : "border-line bg-surface hover:border-discovery"}`}>{x.text}<span aria-hidden="true">→</span></a></li>
              ))}
            </ul>
          )}
          {currencies.map((c) => {
            const x = dash.totals[c] ?? ({} as Totals);
            return (
              <section key={c} className="mb-8">
                {currencies.length > 1 && <h2 className="mb-2 text-h3 font-bold">{c}</h2>}
                <h3 className="mb-2 text-small font-bold uppercase tracking-wider text-ink-muted">{t("groupMonth", { month: monthName })}</h3>
                <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Tile label={t("guestsPaid")} value={m(x.guests_paid_month, c)} hint={t("guestsPaidHint")} />
                  <Tile label={t("wenroShare")} value={m(x.wenro_share_month, c)} hint={t("wenroShareHint")} tone="wenro" />
                  <Tile label={t("received")} value={m(x.received_month, c)} hint={t("receivedHint")} tone="in" />
                  <Tile label={t("paidPartners")} value={m(x.paid_partners_month, c)} hint={t("paidPartnersHint")} tone="out" />
                </div>
                <h3 className="mb-2 text-small font-bold uppercase tracking-wider text-ink-muted">{t("groupNow")}</h3>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Tile label={t("operatorsOwe")} value={m(x.operators_owe, c)} hint={t("operatorsOweHint")} tone="in" />
                  <Tile label={t("inReview")} value={m(x.in_review, c)} hint={t("inReviewHint")} />
                  <Tile label={t("partnersOwed")} value={m(x.partners_owed, c)} hint={t("partnersOwedHint")} tone="out" />
                  <Tile label={t("partnersReady")} value={m(x.partners_ready, c)} hint={t("partnersReadyHint")} tone="out" />
                </div>
              </section>
            );
          })}
          <Card title={t("howTitle")}>
            <ol className="grid gap-3 md:grid-cols-4">
              {(["how1", "how2", "how3", "how4"] as const).map((k, i) => (
                <li key={k} className="flex gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-apricot-tint font-extrabold">{i + 1}</span><span className="text-small">{t(k)}</span></li>
              ))}
            </ol>
          </Card>
        </>
      )}

      {tab === "operators" && (
        <>
          <Card title={tf("generateTitle")} className="mb-6">
            <form action={generateStatements} className="flex flex-wrap items-end gap-3">
              {hidden("/app/admin/finance", "tab=operators")}
              <label className="flex flex-col gap-1 text-small font-bold">{tf("from")}<input type="date" name="from" required defaultValue={lastStart} className={field} /></label>
              <label className="flex flex-col gap-1 text-small font-bold">{tf("to")}<input type="date" name="to" required defaultValue={lastEnd} max={today} className={field} /></label>
              <Submit className={btn.primary}>{tf("generate")}</Submit>
            </form>
            <p className="mt-2 text-small text-ink-muted">{tf("generateHint")}</p>
          </Card>
          {dash.operators.length === 0 ? <Empty>{t("noOperators")}</Empty> : (
            <div className="overflow-x-auto rounded-card border border-line bg-surface">
              <table className="w-full min-w-[820px] text-[14px]">
                <thead><tr className="border-b border-line bg-ivory"><th className={th}>{t("operator")}</th><th className={th}>{t("notOnStatement")}</th><th className={th}>{t("openStatements")}</th><th className={th}>{t("totalOwed")}</th><th className={th}>{t("lastPayment")}</th><th className={th}></th></tr></thead>
                <tbody className="divide-y divide-line">
                  {dash.operators.map((o) => (
                    <tr key={o.id + o.currency}>
                      <td className={td}><b>{o.name}</b>{o.in_review > 0 && <a href="?tab=review" className="ms-2"><Badge value="in_review" /></a>}</td>
                      <td className={`${td} tabular-nums`}>{o.unsettled_trips ? <>{m(o.unsettled_minor, o.currency)} <span className="text-ink-muted">· {tf("trips", { n: o.unsettled_trips })}</span></> : "—"}</td>
                      <td className={`${td} tabular-nums`}>{o.open_statements ? <>{m(o.open_minor, o.currency)} <span className="text-ink-muted">· {o.open_statements}</span></> : "—"}</td>
                      <td className={`${td} font-bold tabular-nums`}>{m(o.owe, o.currency)}</td>
                      <td className={td}>{o.last_received ? d(o.last_received) : <span className="text-ink-muted">{t("never")}</span>}</td>
                      <td className={td}><Link href="/app/admin/finance/operators" className="font-semibold text-discovery hover:underline">{t("details")}</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-small text-ink-muted">{t("operatorsNote")}</p>
        </>
      )}

      {tab === "partners" && (
        <>
          <Card className="mb-6">
            <form action={createPayouts} className="flex flex-wrap items-end gap-3">
              {hidden("/app/admin/finance", "tab=partners")}
              <input type="hidden" name="month" value={`${thisMonth}-01`} />
              <p className="flex-1 text-small">{tf("createPayoutsHint", { month: format.dateTime(new Date(`${thisMonth}-15T12:00:00Z`), { month: "long", year: "numeric" }) })}</p>
              <Submit className={btn.primary}>{tf("createPayouts")}</Submit>
            </form>
          </Card>
          {dash.partners.length === 0 ? <Empty>{t("noPartners")}</Empty> : (
            <div className="mb-8 overflow-x-auto rounded-card border border-line bg-surface">
              <table className="w-full min-w-[820px] text-[14px]">
                <thead><tr className="border-b border-line bg-ivory"><th className={th}>{t("partner")}</th><th className={th}>{t("pWaiting")}</th><th className={th}>{t("pEarned")}</th><th className={th}>{t("pReady")}</th><th className={th}>{t("pPaid")}</th><th className={th}>InstaPay</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {dash.partners.map((p) => (
                    <tr key={p.id + p.currency}>
                      <td className={td}><b>{p.name}</b> <span className="text-small text-ink-muted">{tt(p.type)}</span></td>
                      <td className={`${td} tabular-nums text-ink-muted`}>{m(p.waiting, p.currency)}</td>
                      <td className={`${td} tabular-nums`}>{m(p.earned, p.currency)}</td>
                      <td className={`${td} font-bold tabular-nums`}>{m(p.ready, p.currency)}</td>
                      <td className={`${td} tabular-nums text-success`}>{m(p.paid, p.currency)}</td>
                      <td className={td} dir="ltr">{p.instapay ?? <span className="text-critical">{tf("noInstapay")}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="border-t border-line p-3 text-small text-ink-muted">{t("partnersNote")}</p>
            </div>
          )}
          <h2 className="mb-3 text-h3 font-bold">{tf("payoutsTitle")}</h2>
          {!ov || ov.payouts.length === 0 ? <Empty>{tf("payoutsNone")}</Empty> : (
            <ul className="flex flex-col gap-2">
              {ov.payouts.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-surface p-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 font-bold">{p.partner}<Badge value={p.status} /><span className="text-small font-semibold text-ink-muted">{tt(p.partner_type)}</span></div>
                    <div className="text-small text-ink-muted">{format.dateTime(new Date(`${p.period_month.slice(0, 10)}T12:00:00Z`), { month: "long", year: "numeric" })} · InstaPay: <span dir="ltr">{p.instapay ?? tf("noInstapay")}</span>{p.reference && <> · {tf("reference")}: <span dir="ltr">{p.reference}</span></>}</div>
                    <div className="font-semibold tabular-nums">{m(p.amount_minor, p.currency)}</div>
                  </div>
                  {p.status === "pending" && (
                    <form action={markPayoutPaid} className="flex flex-wrap items-end gap-2">
                      {hidden("/app/admin/finance", "tab=partners")}<input type="hidden" name="payout" value={p.id} />
                      <label className="flex flex-col gap-1 text-small font-bold">{tf("reference")}<input name="reference" required maxLength={80} dir="ltr" className={`${field} w-44`} /></label>
                      <Submit className={btn.primary}>{tf("markPaid")}</Submit>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {tab === "review" && (
        payments.length === 0 ? <Empty>{t("reviewNone")}</Empty> : (
          <ul className="flex flex-col gap-3">
            {payments.map((p) => (
              <li key={p.id} className={`grid gap-4 rounded-card border p-4 md:grid-cols-[180px_1fr] ${p.status === "submitted" ? "border-apricot bg-surface" : "border-line bg-surface opacity-90"}`}>
                <a href={`/api/proof/${p.id}`} target="_blank" rel="noopener noreferrer" className="group relative grid h-44 place-items-center overflow-hidden rounded-[12px] border border-line bg-ivory">
                  {p.proof_kind === "image"
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={`/api/proof/${p.id}`} alt={t("receipt")} className="h-full w-full object-contain" loading="lazy" />
                    : <span className="font-bold text-discovery">PDF</span>}
                  <span className="absolute inset-x-0 bottom-0 bg-ink/70 py-1 text-center text-small font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">{t("openReceipt")}</span>
                </a>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2"><b className="text-h3">{m(p.amount_minor, p.currency)}</b><Badge value={p.status === "submitted" ? "in_review" : p.status === "approved" ? "received" : "declined"} /></div>
                  <div className="text-[14px]"><b>{p.operator}</b> · {p.method}{p.reference && <> · {t("ref")}: <span dir="ltr" className="font-mono">{p.reference}</span></>} · {d(p.created_at)}</div>
                  {p.statements && <ul className="text-small text-ink-muted">{p.statements.map((s, i) => <li key={i}>{d(s.period_start)} – {d(s.period_end)} · {tf("trips", { n: s.bookings_count })} · {m(s.due_minor, p.currency)}</li>)}</ul>}
                  {p.note && <p className="rounded-control bg-ivory p-2 text-small">“{p.note}”</p>}
                  {p.review_note && <p className="text-small text-ink-muted">{t("reviewNote")}: {p.review_note}</p>}
                  {p.status === "submitted" && (
                    <form action={reviewPayment} className="mt-1 flex flex-wrap items-end gap-2">
                      <input type="hidden" name="locale" value={locale} /><input type="hidden" name="payment" value={p.id} />
                      <label className="flex min-w-60 flex-1 flex-col gap-1 text-small font-bold">{t("noteLabel")}<input name="note" maxLength={500} className={field} placeholder={t("notePlaceholder")} /></label>
                      <button name="decision" value="approve" className="btn-press inline-flex min-h-11 items-center rounded-control bg-success px-4 font-bold text-white">{t("approve")}</button>
                      <button name="decision" value="reject" className={btn.quiet}>{t("reject")}</button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )
      )}

      {tab === "methods" && (
        <div className="flex flex-col gap-4">
          <p className="max-w-2xl text-small text-ink-muted">{t("methodsHint")}</p>
          {[...methods, null].map((x) => (
            <Card key={x?.id ?? "new"} title={x ? x.label : t("addMethod")}>
              <form action={savePaymentMethod} className="grid gap-3 md:grid-cols-2">
                <input type="hidden" name="locale" value={locale} /><input type="hidden" name="id" value={x?.id ?? ""} />
                <label className="flex flex-col gap-1 text-small font-bold">{t("mKind")}
                  <select name="kind" defaultValue={x?.kind ?? "instapay"} className={field}>
                    {(["instapay", "bank", "wallet", "link"] as const).map((k) => <option key={k} value={k}>{t(`kinds.${k}`)}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-small font-bold">{t("mLabel")}<input name="label" required minLength={2} maxLength={60} defaultValue={x?.label ?? ""} placeholder="InstaPay" className={field} /></label>
                <label className="flex flex-col gap-1 text-small font-bold">{t("mAccount")}<input name="account_name" maxLength={120} defaultValue={x?.account_name ?? ""} className={field} /></label>
                <label className="flex flex-col gap-1 text-small font-bold">{t("mValue")}<input name="value" required minLength={2} maxLength={200} dir="ltr" defaultValue={x?.value ?? ""} placeholder="wenro@instapay" className={field} /></label>
                <label className="flex flex-col gap-1 text-small font-bold md:col-span-2">{t("mExtra")}<textarea name="extra" maxLength={300} rows={2} defaultValue={x?.extra ?? ""} className={`${field} py-2`} /></label>
                <label className="flex flex-col gap-1 text-small font-bold">{t("mUrl")}<input name="pay_url" type="url" maxLength={500} dir="ltr" defaultValue={x?.pay_url ?? ""} placeholder="https://ipn.eg/…" className={field} /><span className="font-normal text-ink-muted">{t("mUrlHint")}</span></label>
                <div className="flex items-end gap-4">
                  <label className="flex flex-col gap-1 text-small font-bold">{t("mSort")}<input name="sort" type="number" min={0} max={99} defaultValue={x?.sort ?? 0} className={`${field} w-24`} /></label>
                  <label className="flex min-h-11 items-center gap-2 text-small font-bold"><input type="checkbox" name="active" defaultChecked={x?.active ?? true} className="size-5" />{t("mActive")}</label>
                </div>
                <div className="md:col-span-2"><Submit className={btn.primary}>{x ? t("save") : t("add")}</Submit></div>
              </form>
            </Card>
          ))}
        </div>
      )}

      {tab === "history" && (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card title={tf("statementsTitle")}>
            {!ov || ov.statements.length === 0 ? <Empty>{tf("statementsNone")}</Empty> : (
              <ul className="divide-y divide-line">
                {ov.statements.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-[14px]">
                    <span><b>{s.operator}</b> · {d(s.period_start)} – {d(s.period_end)} · {tf("trips", { n: s.bookings_count })}</span>
                    <span className="flex items-center gap-2 tabular-nums"><b>{m(s.due_minor, s.currency)}</b><Badge value={s.status === "open" ? "pending" : "received"} /></span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title={t("movements")}>
            {dash.movements.length === 0 ? <Empty>{t("noMovements")}</Empty> : (
              <ul className="divide-y divide-line">
                {dash.movements.map((x, i) => (
                  <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-[14px]">
                    <span>{t.has(`ledger.${x.type}`) ? t(`ledger.${x.type}` as "ledger.partner_payout") : x.type}{x.org && <> · <b>{x.org}</b></>} <span className="text-ink-muted">· {d(x.at)}</span></span>
                    <span className={`tabular-nums font-semibold ${x.amount_minor < 0 ? "text-success" : ""}`}>{m(Math.abs(x.amount_minor), x.currency)}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-small text-ink-muted">{t("movementsNote")}</p>
          </Card>
        </div>
      )}

      <p className="mt-8 rounded-card bg-warning-tint p-4 text-small text-warning">{tf("legalNote")}</p>
    </>
  );
}
