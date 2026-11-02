import { getTranslations, setRequestLocale } from "next-intl/server";
import { rpc } from "@/lib/data/rpc";
import { formatMoney } from "@/lib/money";
import { dayKey } from "@/lib/pricing";
import { requirePlatform } from "@/lib/workspaces";
import { Card, Flash, PageTitle, Task, btn } from "@/components/ui";
import { Submit } from "@/components/Submit";
import { demoJoinAll } from "../actions";

export const dynamic = "force-dynamic";

type Overview = {
  pending_orgs: number; experiences_in_review: number; pending_requests: number; tomorrow_bookings: number;
  tomorrow_unconfirmed: number; open_statements: number; open_statements_due: Record<string, number>;
  unsettled_executed: number; pending_payouts: number; payable_commissions: Record<string, number>;
};
type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ ok?: string; err?: string }> };

export default async function AdminOverview({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const q = await searchParams;
  await requirePlatform(locale);
  const t = await getTranslations("app.admin");
  const [o, demo] = await Promise.all([
    rpc<Overview>("admin_overview", {}, "user"),
    rpc<{ available: boolean; joined?: boolean }>("demo_status", {}, "user").catch(() => ({ available: false, joined: true })),
  ]);
  const base = `/${locale}/app/admin`;
  const money = (m: Record<string, number>) =>
    Object.entries(m).length ? Object.entries(m).map(([c, v]) => formatMoney({ minor: Number(v), currency: c as "EUR" }, locale)).join(" · ") : "—";
  const tomorrow = dayKey(new Date(Date.parse(`${dayKey(new Date().toISOString())}T12:00:00Z`) + 864e5).toISOString());

  return (
    <>
      <PageTitle title={t("overviewTitle")} sub={t("overviewSub")} />
      <Flash ok={q.ok} err={q.err} />
      {demo.available && !demo.joined && (
        <form action={demoJoinAll} className="flash-in mb-6 flex flex-wrap items-center justify-between gap-3 rounded-card border-2 border-discovery bg-discovery-tint p-4">
          <input type="hidden" name="locale" value={locale} /><input type="hidden" name="back" value="/app/admin" />
          <span className="max-w-xl"><b>{t("demoTitle")}</b><br /><span className="text-small">{t("demoBody")}</span></span>
          <Submit className={btn.primary}>{t("demoButton")}</Submit>
        </form>
      )}
      <h2 className="mb-3 font-bold">{t("needsAction")}</h2>
      <div className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Task tone="warn" count={o.tomorrow_unconfirmed} label={t("tomorrowUnconfirmed")} href={`${base}/bookings?d=${tomorrow}&r=sent`} />
        <Task tone="warn" count={o.pending_requests} label={t("pendingRequests")} href={`${base}/bookings?s=pending_request&span=90`} />
        <Task tone="warn" count={o.pending_orgs} label={t("pendingOrgs")} href={`${base}/partners`} />
        <Task tone="warn" count={o.experiences_in_review} label={t("inReview")} href={`${base}/experiences`} />
        <Task tone="warn" count={o.pending_payouts} label={t("pendingPayouts")} href={`${base}/finance#payouts`} />
        <Task tone="warn" count={o.open_statements} label={t("openStatements")} href={`${base}/finance#statements`} />
      </div>
      <h2 className="mb-3 font-bold">{t("glance")}</h2>
      <div className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Task count={o.tomorrow_bookings} label={t("tomorrowBookings")} href={`${base}/bookings?d=${tomorrow}`} />
        <Task count={o.unsettled_executed} label={t("unsettled")} href={`${base}/finance#unsettled`} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card title={t("dueFromOperators")}><p className="text-h3 font-bold tabular-nums">{money(o.open_statements_due)}</p><p className="mt-1 text-small text-ink-muted">{t("dueFromOperatorsHint")}</p></Card>
        <Card title={t("owedToPartners")}><p className="text-h3 font-bold tabular-nums">{money(o.payable_commissions)}</p><p className="mt-1 text-small text-ink-muted">{t("owedToPartnersHint")}</p></Card>
      </div>
      <p className="mt-8 rounded-card bg-warning-tint p-4 text-small text-warning">{t("automationNote")}</p>
    </>
  );
}
