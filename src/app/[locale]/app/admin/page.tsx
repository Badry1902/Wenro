import { getTranslations, setRequestLocale } from "next-intl/server";
import { rpc } from "@/lib/data/rpc";
import { formatMoney } from "@/lib/money";
import { dayKey } from "@/lib/pricing";
import { requirePlatform } from "@/lib/workspaces";
import { Flash, PageTitle, Task, btn } from "@/components/ui";
import { platformCan, type PlatformPerm } from "@/lib/permissions";
import { SiteVisits, type Visits } from "@/components/VisitsPanel";
import { Submit } from "@/components/Submit";
import { demoJoinAll } from "../actions";

export const dynamic = "force-dynamic";

type Overview = {
  pending_orgs: number; experiences_in_review: number; pending_requests: number; tomorrow_bookings: number;
  tomorrow_unconfirmed: number; failed_messages: number;
  // only for owner / finance
  open_statements?: number; open_statements_due?: Record<string, number>; unsettled_executed?: number;
  unsettled_due?: Record<string, number>; pending_payouts?: number; payable_commissions?: Record<string, number>;
};
type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ ok?: string; err?: string }> };

export default async function AdminOverview({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const q = await searchParams;
  const ws = await requirePlatform(locale);
  const can = (p: PlatformPerm) => platformCan(ws.role, p);
  const t = await getTranslations("app.admin");
  const [o, demo, pendingReviews, visits] = await Promise.all([
    rpc<Overview>("admin_overview", {}, "user"),
    can("team")
      ? rpc<{ available: boolean; joined?: boolean }>("demo_status", {}, "user").catch(() => ({ available: false, joined: true }))
      : Promise.resolve({ available: false, joined: true }),
    can("reviews") ? rpc<unknown[]>("admin_reviews", { p_status: "pending" }, "user").then((r) => r.length).catch(() => 0) : Promise.resolve(0),
    rpc<Visits>("admin_visits", { p_days: 7 }, "user").catch(() => null),
  ]);
  const base = `/${locale}/app/admin`;
  const money = (m: Record<string, number> = {}) =>
    Object.entries(m).length ? Object.entries(m).map(([c, v]) => formatMoney({ minor: Number(v), currency: c as "EUR" }, locale)).join(" · ") : "—";
  const tomorrow = dayKey(new Date(Date.parse(`${dayKey(new Date().toISOString())}T12:00:00Z`) + 864e5).toISOString());

  return (
    <>
      <PageTitle title={t("overviewTitle")} sub={t.has(`focus.${ws.role}`) ? t(`focus.${ws.role}` as "focus.owner") : t("overviewSub")} />
      <Flash ok={q.ok} err={q.err} />
      {demo.available && !demo.joined && (
        <form action={demoJoinAll} className="flash-in mb-6 flex flex-wrap items-center justify-between gap-3 rounded-card border-2 border-discovery bg-discovery-tint p-4">
          <input type="hidden" name="locale" value={locale} /><input type="hidden" name="back" value="/app/admin" />
          <span className="max-w-xl"><b>{t("demoTitle")}</b><br /><span className="text-small">{t("demoBody")}</span></span>
          <Submit className={btn.primary}>{t("demoButton")}</Submit>
        </form>
      )}
      {visits && <SiteVisits v={visits} />}
      <h2 className="mb-3 font-bold">{t("needsAction")}</h2>
      <div className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {can("bookings") && <Task tone="warn" count={o.tomorrow_unconfirmed} label={t("tomorrowUnconfirmed")} href={`${base}/bookings?d=${tomorrow}&r=sent`} />}
        {can("bookings") && <Task tone="warn" count={o.pending_requests} label={t("pendingRequests")} href={`${base}/bookings?s=pending_request&span=90`} />}
        {can("partnersAct") && <Task tone="warn" count={o.pending_orgs} label={t("pendingOrgs")} href={`${base}/partners`} />}
        {can("experiences") && <Task tone="warn" count={o.experiences_in_review} label={t("inReview")} href={`${base}/experiences`} />}
        {can("reviews") && <Task tone="warn" count={pendingReviews} label={t("pendingReviews")} href={`${base}/reviews`} />}
        {can("messages") && <Task tone="warn" count={o.failed_messages} label={t("failedMessages")} href={`${base}/messages`} />}
        {can("finance") && <Task tone="warn" count={o.pending_payouts ?? 0} label={t("pendingPayouts")} href={`${base}/finance#payouts`} />}
        {can("finance") && <Task tone="warn" count={o.open_statements ?? 0} label={t("openStatements")} href={`${base}/finance/operators`} />}
      </div>
      {(can("bookings") || can("finance")) && <h2 className="mb-3 font-bold">{t("glance")}</h2>}
      <div className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {can("bookings") && <Task count={o.tomorrow_bookings} label={t("tomorrowBookings")} href={`${base}/bookings?d=${tomorrow}`} />}
        {can("finance") && <Task count={o.unsettled_executed ?? 0} label={t("unsettled")} href={`${base}/finance/operators#unsettled`} />}
      </div>
      {can("finance") && (
        <div className="grid gap-4 md:grid-cols-2">
          <a href={`${base}/finance/operators`} className="group block rounded-card border border-line p-5 transition-colors hover:border-discovery hover:bg-discovery-tint">
            <span className="flex items-center justify-between font-bold">{t("dueFromOperators")}<span aria-hidden="true" className="text-discovery transition-transform group-hover:translate-x-1 rtl:-scale-x-100">→</span></span>
            <span className="mt-2 block text-h3 font-bold tabular-nums">{money(o.open_statements_due)}</span>
            <span className="mt-1 block text-small text-ink-muted">{t("dueFromOperatorsHint")}</span>
            {Object.keys(o.unsettled_due ?? {}).length > 0 && <span className="mt-2 block text-small font-semibold">{t("plusUnsettled", { amount: money(o.unsettled_due) })}</span>}
            <span className="mt-3 block text-small font-bold text-discovery">{t("seeTrips")}</span>
          </a>
          <a href={`${base}/finance/partners`} className="group block rounded-card border border-line p-5 transition-colors hover:border-discovery hover:bg-discovery-tint">
            <span className="flex items-center justify-between font-bold">{t("owedToPartners")}<span aria-hidden="true" className="text-discovery transition-transform group-hover:translate-x-1 rtl:-scale-x-100">→</span></span>
            <span className="mt-2 block text-h3 font-bold tabular-nums">{money(o.payable_commissions)}</span>
            <span className="mt-1 block text-small text-ink-muted">{t("owedToPartnersHint")}</span>
            <span className="mt-3 block text-small font-bold text-discovery">{t("seeTrips")}</span>
          </a>
        </div>
      )}
      {can("team") && <p className="mt-8 rounded-card bg-warning-tint p-4 text-small text-warning">{t("automationNote")}</p>}
    </>
  );
}
