import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatMoney } from "@/lib/money";
import { Pin } from "../ui";

export type PartnerStats = {
  currency: string; earned_minor: number; pending_minor: number; paid_minor: number;
  month_trips: number; month_bookings: number; all_trips: number; distinct_trips: number; clicks_month: number;
  trips: { slug: string; title: string | null; clicks: number; bookings: number; commission_minor: number }[];
};

export const LEVELS = [
  { key: "explorer", min: 0 }, { key: "bronze", min: 5 }, { key: "silver", min: 15 }, { key: "gold", min: 30 },
] as const;

/**
 * Levels, badges and earnings for marketers and agencies. Levels only celebrate progress (trips done this
 * month); they do not change the commission.
 */
export async function PartnerGrowth({ s, locale, org }: { s: PartnerStats; locale: string; org: string }) {
  const t = await getTranslations("app.growth");
  const m = (minor: number) => formatMoney({ minor: Number(minor), currency: (s.currency || "EUR") as "EUR" }, locale);
  const n = Number(s.month_trips);
  const idx = LEVELS.reduce((a, l, i) => (n >= l.min ? i : a), 0);
  const level = LEVELS[idx], next = LEVELS[idx + 1];
  const pct = next ? Math.min(100, ((n - level.min) / (next.min - level.min)) * 100) : 100;
  const badges = [
    { key: "first", on: Number(s.all_trips) >= 1 }, { key: "ten", on: Number(s.all_trips) >= 10 }, { key: "fifty", on: Number(s.all_trips) >= 50 },
    { key: "variety", on: Number(s.distinct_trips) >= 5 }, { key: "reach", on: Number(s.clicks_month) >= 100 },
  ];
  const best = [...s.trips].filter((x) => Number(x.clicks) >= 5).sort((a, b) => Number(b.bookings) / Number(b.clicks) - Number(a.bookings) / Number(a.clicks))[0];

  return (
    <div className="mb-8 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      {/* The figure that matters to a marketer: what this month earns */}
      <section aria-labelledby="earn-h" className="rounded-card border border-line bg-surface p-5 lg:order-2">
        <h2 id="earn-h" className="font-sans text-[13px] font-normal text-ink-muted">{t("earnTitle")}</h2>
        <p className="mt-1 text-[40px] font-medium leading-none tabular-nums">{m(Number(s.earned_minor) + Number(s.pending_minor))}</p>
        <p className="mt-2 text-[13px] text-ink-muted">{t("forecast", { amount: m(Number(s.earned_minor) + Number(s.pending_minor)) })}</p>
        <dl className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-[12px] border border-line bg-line">
          {([["earned", s.earned_minor], ["coming", s.pending_minor], ["paid", s.paid_minor]] as const).map(([k, v]) => (
            <div key={k} className="bg-surface px-3 py-3"><dt className="text-[12px] text-ink-muted">{t(k)}</dt><dd className="mt-0.5 text-[17px] font-medium tabular-nums">{m(v)}</dd></div>
          ))}
        </dl>
        <p className="mt-2 text-[12px] text-ink-muted">{t("forecastNote")}</p>
        {best && <p className="mt-4 flex gap-2 border-t border-line pt-4 text-[14px]"><Pin className="mt-1" />{t("tip", { title: best.title ?? best.slug })}</p>}
        <Link href={`/app/p/${org}/kit`} className="btn-press mt-4 inline-flex min-h-11 items-center rounded-control bg-discovery px-4 text-[14px] font-semibold text-white transition-colors duration-150 hover:bg-discovery-hover">{t("kitCta")}</Link>
      </section>
      <section aria-labelledby="lvl-h" className="rounded-card border border-line bg-surface p-5 lg:order-1">
        <h2 id="lvl-h" className="font-sans text-[13px] font-normal text-ink-muted">{t("levelTitle")}</h2>
        <p className="mt-1 text-[24px] font-medium">{t(`levels.${level.key}`)}</p>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#ECEBE6]"><div className="h-full rounded-full bg-discovery" style={{ width: `${pct}%` }} /></div>
        <p className="mt-2 text-[14px]">{next ? t("toNext", { n: next.min - n, level: t(`levels.${next.key}`) }) : t("top")}</p>
        <p className="mt-1 text-[12px] text-ink-muted">{t("levelNote")}</p>
        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2" aria-label={t("badges")}>
          {badges.map((b) => (
            <li key={b.key} className={`inline-flex items-center gap-1.5 text-[13px] ${b.on ? "text-ink" : "text-ink-muted/60"}`} title={t(`badge.${b.key}.hint`)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {b.on ? <><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.5 2.5L16 9.5" /></> : <circle cx="12" cy="12" r="9" />}
              </svg>
              {t(`badge.${b.key}.name`)}
            </li>
          ))}
        </ul>
      </section>
      {s.trips.length > 0 && (
        <section aria-labelledby="best-h" className="rounded-card border border-line bg-surface lg:order-3 lg:col-span-2">
          <div className="border-b border-line px-5 py-3">
            <h2 id="best-h" className="text-[15px] font-semibold">{t("bestTitle")}</h2>
            <p className="text-[13px] text-ink-muted">{t("bestSub")}</p>
          </div>
          <div className="px-3 py-2">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[460px] text-small">
              <thead className="text-ink-muted"><tr className="border-b border-line">
                <th className="p-2 text-start font-medium">{t("trip")}</th><th className="p-2 text-end font-medium">{t("clicks")}</th>
                <th className="p-2 text-end font-medium">{t("bookings")}</th><th className="p-2 text-end font-medium">{t("commission")}</th>
              </tr></thead>
              <tbody>
                {s.trips.slice(0, 8).map((x) => (
                  <tr key={x.slug} className="border-b border-line last:border-0">
                    <td className="p-2">{x.title ?? x.slug}</td><td className="p-2 text-end tabular-nums">{x.clicks}</td>
                    <td className="p-2 text-end font-medium tabular-nums">{x.bookings}</td><td className="p-2 text-end tabular-nums">{m(x.commission_minor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
        </section>
      )}
    </div>
  );
}
