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
  return (
    <section aria-labelledby="visits-h" className="mb-8 rounded-card border border-line p-5">
      <h2 id="visits-h" className="mb-1 font-bold">{t("title")}</h2>
      <p className="mb-4 text-small text-ink-muted">{t("sub")}</p>
      <dl className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([["today", v.today.visitors], ["todayViews", v.today.views], ["week", week.visitors], ["conversion", conv == null ? "—" : `${conv.toFixed(conv < 10 ? 1 : 0)}%`]] as const).map(([k, val]) => (
          <div key={k} className="rounded-card bg-[#F3F4F8] p-3"><dt className="text-small text-ink-muted">{t(k)}</dt><dd className="text-h2 font-bold tabular-nums">{val}</dd></div>
        ))}
      </dl>
      <div className="mb-5 flex h-28 items-end gap-2" role="img" aria-label={t("chart")}>
        {v.days.map((d) => (
          <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[11px] tabular-nums text-ink-muted">{d.visitors}</span>
            <span className="w-full rounded-t-[6px] bg-discovery" style={{ height: `${Math.max(3, (d.visitors / max) * 80)}px` }} />
            <span className="text-[11px] text-ink-muted">{format.dateTime(new Date(`${d.day}T12:00:00Z`), { weekday: "short" })}</span>
          </div>
        ))}
      </div>
      {v.top.length > 0 && <TripTable rows={v.top} />}
    </section>
  );
}

export async function TripTable({ rows }: { rows: TripVisits }) {
  const t = await getTranslations("app.visits");
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-small">
        <thead className="text-ink-muted"><tr className="border-b border-line">
          <th className="p-2 text-start font-semibold">{t("trip")}</th><th className="p-2 text-end font-semibold">{t("visitors")}</th>
          <th className="p-2 text-end font-semibold">{t("views")}</th><th className="p-2 text-end font-semibold">{t("bookings")}</th>
        </tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.slug} className="border-b border-line last:border-0">
              <td className="p-2"><Link href={`/experiences/${r.slug}`} className="font-semibold hover:text-discovery">{r.title ?? r.slug}</Link></td>
              <td className="p-2 text-end tabular-nums">{r.visitors}</td><td className="p-2 text-end tabular-nums">{r.views}</td>
              <td className="p-2 text-end font-bold tabular-nums">{r.bookings}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
