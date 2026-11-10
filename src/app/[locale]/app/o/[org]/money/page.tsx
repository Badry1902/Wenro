import { notFound } from "next/navigation";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { rpc } from "@/lib/data/rpc";
import { formatMoney } from "@/lib/money";
import { requireWorkspace } from "@/lib/workspaces";
import { Badge, Card, Empty, Flash, PageTitle } from "@/components/ui";
import { PayDues, type DueStatement, type PayMethod } from "@/components/money/PayDues";

export const dynamic = "force-dynamic";

type Sum = { trips: number; guests?: number; collected?: number; kept?: number; to_wenro: number };
type Finance = {
  month: string;
  this_month: Record<string, Sum>;
  unsettled: Record<string, Sum>;
  upcoming: { bookings: number; guests: number };
  statements: { id: string; currency: string; period_start: string; period_end: string; bookings_count: number; collected_minor: number; due_minor: number; status: string; received_at: string | null }[];
  recent: { ref: string; executed_at: string; seats: number; currency: string; collected: number; kept: number; to_wenro: number; settled: boolean; title: string }[];
};

/** Operator owners and managers: what came in, what they keep, what goes to WENRO. Staff never see this page. */
type Dues = {
  statements: { id: string; currency: "EUR" | "USD" | "EGP"; period_start: string; period_end: string; bookings_count: number; due_minor: number; in_review: boolean }[];
  unsettled: Record<string, { trips: number; due_minor: number }>;
  payments: { id: string; currency: string; amount_minor: number; method: string; reference: string | null; status: string; created_at: string; review_note: string | null; statements: number }[];
};

export default async function OperatorMoney({ params, searchParams }: { params: Promise<{ locale: string; org: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { locale, org } = await params;
  const q = await searchParams;
  setRequestLocale(locale);
  const ws = await requireWorkspace(locale, org, ["operator"]);
  if (!["owner", "manager"].includes(ws.role)) notFound();
  const t = await getTranslations("app.money");
  const format = await getFormatter();
  const tp = await getTranslations("app.pay");
  const [f, dues, methods] = await Promise.all([
    rpc<Finance>("operator_finance", { p_operator: org }, "user"),
    rpc<Dues>("operator_dues", { p_operator: org }, "user").catch(() => null),
    rpc<PayMethod[]>("payment_methods_list", {}, "user").catch(() => [] as PayMethod[]),
  ]);
  const m = (minor: number | undefined, c: string) => formatMoney({ minor: Number(minor ?? 0), currency: c as "EUR" }, locale);
  const d = (iso: string | null) => iso ? format.dateTime(new Date(`${iso.slice(0, 10)}T12:00:00Z`), { day: "numeric", month: "short" }) : "—";
  const currencies = [...new Set([...Object.keys(f.this_month), ...Object.keys(f.unsettled)])];
  if (currencies.length === 0) currencies.push("EUR");

  return (
    <>
      <PageTitle title={t("title")} sub={t("sub", { month: format.dateTime(new Date(`${f.month}T12:00:00Z`), { month: "long", year: "numeric" }) })} />
      <Flash ok={q.ok} err={q.err} />

      {/* Pay WENRO: open statements → method → receipt → WENRO checks it */}
      <section id="pay" className="mb-8 scroll-mt-6">
        <h2 className="mb-1 text-h3 font-bold">{tp("title")}</h2>
        <p className="mb-3 max-w-2xl text-small text-ink-muted">{tp("sub")}</p>
        {!dues ? (
          // Online payment not switched on yet (database update pending): still show what is owed, never "nothing"
          (() => {
            const owed = currencies.map((c) => ({ c, v: Number(f.unsettled[c]?.to_wenro ?? 0) + f.statements.filter((st) => st.status === "open" && st.currency === c).reduce((a, st) => a + Number(st.due_minor), 0) })).filter((x) => x.v > 0);
            return owed.length
              ? <p className="rounded-card border border-apricot bg-apricot-tint p-4">{tp("owedOffline", { amount: owed.map((x) => m(x.v, x.c)).join(" + ") })}</p>
              : <Empty>{tp("nothing")}</Empty>;
          })()
        ) : dues.statements.length === 0 && Object.keys(dues.unsettled).length === 0 ? (
          <Empty>{tp("nothing")}</Empty>
        ) : (
          <PayDues org={org} locale={locale} methods={methods}
            unsettled={Object.entries(dues.unsettled).filter(([, u]) => Number(u.due_minor) > 0).map(([c, u]) => ({ currency: c as "EUR", trips: u.trips, due_minor: Number(u.due_minor), label: tp("unsettledItem") }))}
            statements={dues.statements.map((st): DueStatement => ({ id: st.id, currency: st.currency, period: `${d(st.period_start)} – ${d(st.period_end)}`, trips: st.bookings_count, due_minor: Number(st.due_minor), in_review: st.in_review }))}
            labels={{
              choose: tp("choose"), total: tp("total"), payNow: tp("payNow"), methodTitle: tp("methodTitle"), methodHint: tp("methodHint"),
              accountName: tp("accountName"), copy: tp("copy"), copied: tp("copied"), open: tp.raw("open") as string, paidConfirm: tp("paidConfirm"),
              confirmTitle: tp("confirmTitle"), confirmHint: tp("confirmHint"), reference: tp("reference"), referenceHint: tp("referenceHint"),
              proof: tp("proof"), proofHint: tp("proofHint"), note: tp("note"), submit: tp("submit"), back: tp("back"), inReview: tp("inReview"),
              noMethods: tp("noMethods"), valueLabel: tp("valueLabel"), extra: tp("extra"),
            }} />
        )}
        {dues && dues.payments.length > 0 && (
          <Card title={tp("history")} className="mt-4">
            <ul className="divide-y divide-line">
              {dues.payments.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <span className="text-[14px]">{format.dateTime(new Date(p.created_at), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {p.method}{p.reference && <> · <span dir="ltr">{p.reference}</span></>}
                    {p.status === "rejected" && p.review_note && <span className="block text-small text-critical">{p.review_note}</span>}</span>
                  <span className="flex items-center gap-2 tabular-nums"><b>{m(p.amount_minor, p.currency)}</b><Badge value={p.status === "submitted" ? "in_review" : p.status === "approved" ? "received" : "declined"} /></span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
      {currencies.map((c) => {
        const s = f.this_month[c];
        const u = f.unsettled[c];
        return (
          <div key={c} className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-card border border-line p-4"><div className="text-small font-semibold text-ink-muted">{t("trips")}</div><div className="text-h2 font-bold tabular-nums">{s?.trips ?? 0}</div><div className="text-small text-ink-muted">{t("guests", { n: s?.guests ?? 0 })}</div></div>
            <div className="rounded-card border border-line p-4"><div className="text-small font-semibold text-ink-muted">{t("collected")}</div><div className="text-h2 font-bold tabular-nums">{m(s?.collected, c)}</div></div>
            <div className="rounded-card border border-success bg-success-tint p-4"><div className="text-small font-semibold text-success">{t("kept")}</div><div className="text-h2 font-bold tabular-nums text-success">{m(s?.kept, c)}</div></div>
            <div className="rounded-card border border-apricot bg-apricot-tint p-4"><div className="text-small font-semibold">{t("toWenro")}</div><div className="text-h2 font-bold tabular-nums">{m(Number(u?.to_wenro ?? 0) + f.statements.filter((st) => st.status === "open" && st.currency === c).reduce((x, st) => x + Number(st.due_minor), 0), c)}</div>
              <div className="text-small">{(() => {
                const open = f.statements.filter((st) => st.status === "open" && st.currency === c).length;
                const trips = u?.trips ?? 0;
                return [trips > 0 || open === 0 ? t("toWenroHint", { n: trips }) : null, open > 0 ? tp("inStatements", { n: open }) : null].filter(Boolean).join(" · ");
              })()}</div>
              <a href="#pay" className="mt-1 inline-block text-small font-bold text-discovery hover:underline">{tp("payLink")}</a></div>
          </div>
        );
      })}
      <p className="mb-8 text-small text-ink-muted">{t("upcoming", { bookings: f.upcoming.bookings, guests: f.upcoming.guests })}</p>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title={t("statements")}>
          {f.statements.length === 0 ? <Empty>{t("noStatements")}</Empty> : (
            <ul className="divide-y divide-line">
              {f.statements.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <span>{d(s.period_start)} – {d(s.period_end)} · {t("tripsN", { n: s.bookings_count })}</span>
                  <span className="flex items-center gap-2 tabular-nums"><b>{m(s.due_minor, s.currency)}</b><Badge value={s.status === "open" ? "pending" : "received"} /></span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-small text-ink-muted">{t("statementsHint")}</p>
        </Card>
        <Card title={t("recent")}>
          {f.recent.length === 0 ? <Empty>{t("noTrips")}</Empty> : (
            <ul className="divide-y divide-line">
              {f.recent.map((r) => (
                <li key={r.ref} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-[14px]">
                  <span className="min-w-0"><span dir="ltr" className="font-semibold">{r.ref}</span> · {r.title} · {d(r.executed_at)}</span>
                  <span className="tabular-nums">{m(r.kept, r.currency)} <span className="text-ink-muted">/ {m(r.to_wenro, r.currency)}</span></span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-small text-ink-muted">{t("recentHint")}</p>
        </Card>
      </div>
    </>
  );
}
