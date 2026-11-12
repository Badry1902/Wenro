import { getTranslations, setRequestLocale } from "next-intl/server";
import { rpc } from "@/lib/data/rpc";
import { formatMoney } from "@/lib/money";
import { dayKey } from "@/lib/pricing";
import { requirePlatform } from "@/lib/workspaces";
import { Flash, PageTitle, Stat, StatRow, Task, TaskList, btn } from "@/components/ui";
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
      {/* Decisions first: one list, what needs doing now carries the pin and comes to the top */}
      <div className="mb-8 grid items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <TaskList title={t("needsAction")}>
          {[
            can("bookings") && { k: "tu", n: o.tomorrow_unconfirmed, label: t("tomorrowUnconfirmed"), href: `${base}/bookings?d=${tomorrow}&r=sent` },
            can("bookings") && { k: "pr", n: o.pending_requests, label: t("pendingRequests"), href: `${base}/bookings?s=pending_request&span=90` },
            can("partnersAct") && { k: "po", n: o.pending_orgs, label: t("pendingOrgs"), href: `${base}/partners` },
            can("experiences") && { k: "ir", n: o.experiences_in_review, label: t("inReview"), href: `${base}/experiences` },
            can("reviews") && { k: "rv", n: pendingReviews, label: t("pendingReviews"), href: `${base}/reviews` },
            can("messages") && { k: "fm", n: o.failed_messages, label: t("failedMessages"), href: `${base}/messages` },
            can("finance") && { k: "pp", n: o.pending_payouts ?? 0, label: t("pendingPayouts"), href: `${base}/finance#payouts` },
            can("finance") && { k: "os", n: o.open_statements ?? 0, label: t("openStatements"), href: `${base}/finance/operators` },
          ].filter((x): x is { k: string; n: number; label: string; href: string } => !!x)
            .sort((a, b) => Number(Number(b.n) > 0) - Number(Number(a.n) > 0))
            .map((x) => <Task key={x.k} tone="warn" count={x.n} label={x.label} href={x.href} />)}
        </TaskList>

        {(can("bookings") || can("finance")) && (
          <section aria-label={t("glance")} className="flex flex-col gap-4">
            {can("finance") && (
              <a href={`${base}/finance/operators`} className="group block rounded-card border border-line bg-surface p-5 transition-colors duration-150 hover:border-ink-muted/40">
                <Stat size="lg" label={t("dueFromOperators")} value={money(o.open_statements_due)}
                  note={<>{t("dueFromOperatorsHint")}{Object.keys(o.unsettled_due ?? {}).length > 0 && <span className="mt-1 block text-ink">{t("plusUnsettled", { amount: money(o.unsettled_due) })}</span>}</>} />
                <span className="mt-4 inline-flex items-center gap-1 text-[14px] font-medium text-discovery">{t("seeTrips")}<span aria-hidden="true" className="transition-transform duration-150 group-hover:translate-x-0.5 rtl:-scale-x-100">→</span></span>
              </a>
            )}
            <StatRow cols={2}>
              {can("bookings") && <a href={`${base}/bookings?d=${tomorrow}`} className="block"><Stat label={t("tomorrowBookings")} value={o.tomorrow_bookings} /></a>}
              {can("finance") && <a href={`${base}/finance/operators#unsettled`} className="block"><Stat label={t("unsettled")} value={o.unsettled_executed ?? 0} /></a>}
              {can("finance") && <a href={`${base}/finance/partners`} className="block"><Stat label={t("owedToPartners")} value={money(o.payable_commissions)} note={t("owedToPartnersHint")} /></a>}
            </StatRow>
          </section>
        )}
      </div>

      {visits && <SiteVisits v={visits} />}
      {can("team") && (
        <p className="mt-8 flex gap-2 border-t border-line pt-4 text-[13px] text-ink-muted">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true" className="mt-0.5 shrink-0"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
          {t("automationNote")}
        </p>
      )}
    </>
  );
}
