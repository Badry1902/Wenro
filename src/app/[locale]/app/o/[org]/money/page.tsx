import { notFound } from "next/navigation";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { rpc } from "@/lib/data/rpc";
import { formatMoney } from "@/lib/money";
import { requireWorkspace } from "@/lib/workspaces";
import { Badge, Card, Empty, PageTitle } from "@/components/ui";

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
export default async function OperatorMoney({ params }: { params: Promise<{ locale: string; org: string }> }) {
  const { locale, org } = await params;
  setRequestLocale(locale);
  const ws = await requireWorkspace(locale, org, ["operator"]);
  if (!["owner", "manager"].includes(ws.role)) notFound();
  const t = await getTranslations("app.money");
  const format = await getFormatter();
  const f = await rpc<Finance>("operator_finance", { p_operator: org }, "user");
  const m = (minor: number | undefined, c: string) => formatMoney({ minor: Number(minor ?? 0), currency: c as "EUR" }, locale);
  const d = (iso: string) => format.dateTime(new Date(`${iso.slice(0, 10)}T12:00:00Z`), { day: "numeric", month: "short" });
  const currencies = [...new Set([...Object.keys(f.this_month), ...Object.keys(f.unsettled)])];
  if (currencies.length === 0) currencies.push("EUR");

  return (
    <>
      <PageTitle title={t("title")} sub={t("sub", { month: format.dateTime(new Date(`${f.month}T12:00:00Z`), { month: "long", year: "numeric" }) })} />
      {currencies.map((c) => {
        const s = f.this_month[c];
        const u = f.unsettled[c];
        return (
          <div key={c} className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-card border border-line p-4"><div className="text-small font-semibold text-ink-muted">{t("trips")}</div><div className="text-h2 font-bold tabular-nums">{s?.trips ?? 0}</div><div className="text-small text-ink-muted">{t("guests", { n: s?.guests ?? 0 })}</div></div>
            <div className="rounded-card border border-line p-4"><div className="text-small font-semibold text-ink-muted">{t("collected")}</div><div className="text-h2 font-bold tabular-nums">{m(s?.collected, c)}</div></div>
            <div className="rounded-card border border-success bg-success-tint p-4"><div className="text-small font-semibold text-success">{t("kept")}</div><div className="text-h2 font-bold tabular-nums text-success">{m(s?.kept, c)}</div></div>
            <div className="rounded-card border border-apricot bg-apricot-tint p-4"><div className="text-small font-semibold">{t("toWenro")}</div><div className="text-h2 font-bold tabular-nums">{m(u?.to_wenro, c)}</div><div className="text-small">{t("toWenroHint", { n: u?.trips ?? 0 })}</div></div>
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
