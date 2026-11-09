import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatMoney } from "@/lib/money";

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
  const medal: Record<string, string> = { explorer: "🧭", bronze: "🥉", silver: "🥈", gold: "🥇" };
  const best = [...s.trips].filter((x) => Number(x.clicks) >= 5).sort((a, b) => Number(b.bookings) / Number(b.clicks) - Number(a.bookings) / Number(a.clicks))[0];

  return (
    <div className="mb-8 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
      <section aria-labelledby="lvl-h" className="rounded-card border border-line p-5">
        <div className="flex items-center gap-3">
          <span className="text-[40px] leading-none" aria-hidden="true">{medal[level.key]}</span>
          <div>
            <h2 id="lvl-h" className="text-small font-bold uppercase tracking-wider text-ink-muted">{t("levelTitle")}</h2>
            <p className="text-h3 font-extrabold">{t(`levels.${level.key}`)}</p>
          </div>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#EEF0F6]"><div className="h-full rounded-full bg-gradient-to-r from-discovery to-apricot" style={{ width: `${pct}%` }} /></div>
        <p className="mt-2 text-small">{next ? t("toNext", { n: next.min - n, level: t(`levels.${next.key}`) }) : t("top")}</p>
        <p className="mt-1 text-[12px] text-ink-muted">{t("levelNote")}</p>
        <ul className="mt-4 flex flex-wrap gap-2" aria-label={t("badges")}>
          {badges.map((b) => (
            <li key={b.key} className={`rounded-full px-3 py-1 text-[12px] font-bold ${b.on ? "bg-apricot-tint text-ink" : "bg-[#F3F4F8] text-ink-muted opacity-60"}`} title={t(`badge.${b.key}.hint`)}>
              {b.on ? "★ " : "☆ "}{t(`badge.${b.key}.name`)}
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="earn-h" className="rounded-card border border-line p-5">
        <h2 id="earn-h" className="mb-3 font-bold">{t("earnTitle")}</h2>
        <dl className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-card bg-success-tint p-3"><dt className="text-[12px] font-semibold text-success">{t("earned")}</dt><dd className="text-[18px] font-extrabold tabular-nums">{m(s.earned_minor)}</dd></div>
          <div className="rounded-card bg-discovery-tint p-3"><dt className="text-[12px] font-semibold text-discovery">{t("coming")}</dt><dd className="text-[18px] font-extrabold tabular-nums">{m(s.pending_minor)}</dd></div>
          <div className="rounded-card bg-[#F3F4F8] p-3"><dt className="text-[12px] font-semibold text-ink-muted">{t("paid")}</dt><dd className="text-[18px] font-extrabold tabular-nums">{m(s.paid_minor)}</dd></div>
        </dl>
        <p className="mt-3 text-small">{t("forecast", { amount: m(Number(s.earned_minor) + Number(s.pending_minor)) })}</p>
        <p className="mt-1 text-[12px] text-ink-muted">{t("forecastNote")}</p>
        {best && <p className="mt-3 rounded-control bg-apricot-tint p-3 text-small">💡 {t("tip", { title: best.title ?? best.slug })}</p>}
        <Link href={`/app/p/${org}/kit`} className="btn-press mt-4 inline-flex min-h-11 items-center rounded-control bg-discovery px-4 text-small font-bold text-white">{t("kitCta")}</Link>
      </section>
      {s.trips.length > 0 && (
        <section aria-labelledby="best-h" className="rounded-card border border-line p-5 lg:col-span-2">
          <h2 id="best-h" className="mb-1 font-bold">{t("bestTitle")}</h2>
          <p className="mb-3 text-small text-ink-muted">{t("bestSub")}</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[460px] text-small">
              <thead className="text-ink-muted"><tr className="border-b border-line">
                <th className="p-2 text-start font-semibold">{t("trip")}</th><th className="p-2 text-end font-semibold">{t("clicks")}</th>
                <th className="p-2 text-end font-semibold">{t("bookings")}</th><th className="p-2 text-end font-semibold">{t("commission")}</th>
              </tr></thead>
              <tbody>
                {s.trips.slice(0, 8).map((x) => (
                  <tr key={x.slug} className="border-b border-line last:border-0">
                    <td className="p-2 font-semibold">{x.title ?? x.slug}</td><td className="p-2 text-end tabular-nums">{x.clicks}</td>
                    <td className="p-2 text-end font-bold tabular-nums">{x.bookings}</td><td className="p-2 text-end tabular-nums">{m(x.commission_minor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
