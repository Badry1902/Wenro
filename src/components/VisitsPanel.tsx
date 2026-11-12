import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export type Visits = {
  today: { views: number; visitors: number };
  days: { day: string; views: number; visitors: number }[];
  bookings: number;
  top: { title: string | null; slug: string; views: number; visitors: number; bookings: number }[];
};
export type TripVisits = { title: string | null; slug: string; views: number; visitors: number; bookings: number }[];

/** Site visits for the WENRO team: today, the last 7 days as bars, and the most viewed trips with bookings. */
export async function SiteVisits({ v }: { v: Visits }) {
  const t = await getTranslations("app.visits");
  const format = await getFormatter();
  const week = v.days.reduce((a, d) => ({ views: a.views + d.views, visitors: a.visitors + d.visitors }), { views: 0, visitors: 0 });
  const max = Math.max(1, ...v.days.map((d) => d.visitors));
  const conv = week.visitors ? (v.bookings / week.visitors) * 100 : null;
  const quiet = week.visitors === 0 && v.today.views === 0;
  return (
    <section aria-labelledby="visits-h" className="mb-8 overflow-hidden rounded-card border border-line bg-surface">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-3">
        <h2 id="visits-h" className="text-[15px] font-semibold">{t("title")}</h2>
        <p className="text-[13px] text-ink-muted">{t("sub")}</p>
      </div>
      <dl className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
        {([["today", v.today.visitors], ["todayViews", v.today.views], ["week", week.visitors], ["conversion", conv == null ? "—" : `${conv.toFixed(conv < 10 ? 1 : 0)}%`]] as const).map(([k, val]) => (
          <div key={k} className="bg-surface px-5 py-4"><dt className="text-[13px] text-ink-muted">{t(k)}</dt><dd className="mt-1 text-[24px] font-medium tabular-nums">{val}</dd></div>
        ))}
      </dl>
      {/* bars only once there is something to show: a week of zeros is not a chart */}
      {!quiet && (
        <div className="flex h-36 items-end gap-3 border-t border-line px-5 pb-4 pt-6" role="img" aria-label={t("chart")}>
          {v.days.map((d, i) => (
            <div key={d.day} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="font-mono text-[11px] tabular-nums text-ink-muted">{d.visitors}</span>
              <span className={`w-full max-w-12 rounded-t-[4px] ${i === v.days.length - 1 ? "bg-discovery" : "bg-[#D9DCE6]"}`} style={{ height: `${Math.max(2, (d.visitors / max) * 72)}px` }} />
              <span className="text-[12px] text-ink-muted">{format.dateTime(new Date(`${d.day}T12:00:00Z`), { weekday: "short" })}</span>
            </div>
          ))}
        </div>
      )}
      {v.top.length > 0 && <div className="border-t border-line px-3 py-2"><TripTable rows={v.top} /></div>}
    </section>
  );
}

export async function TripTable({ rows }: { rows: TripVisits }) {
  const t = await getTranslations("app.visits");
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-small">
        <thead className="text-ink-muted"><tr className="border-b border-line">
          <th className="p-2 text-start font-medium">{t("trip")}</th><th className="p-2 text-end font-medium">{t("visitors")}</th>
          <th className="p-2 text-end font-medium">{t("views")}</th><th className="p-2 text-end font-medium">{t("bookings")}</th>
        </tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.slug} className="border-b border-line last:border-0">
              <td className="p-2"><Link href={`/experiences/${r.slug}`} className="hover:text-discovery">{r.title ?? r.slug}</Link></td>
              <td className="p-2 text-end tabular-nums">{r.visitors}</td><td className="p-2 text-end tabular-nums">{r.views}</td>
              <td className="p-2 text-end font-medium tabular-nums">{r.bookings}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
