import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export type OpToday = { requests: number; oldest_request_at: string | null; to_check_in: number; today_guests: number; past_unmarked: number;
  trips_without_departures: { id: string; title: string | null }[]; response_hours: number | null; decided_count: number };

/** The operator's short list for today, and how fast they answer requests. */
export async function OperatorTodo({ d, base, manager }: { d: OpToday; base: string; manager: boolean }) {
  const t = await getTranslations("app.today");
  const items = [
    d.requests > 0 && { key: "requests", n: d.requests, href: `${base}#requests`, warn: true },
    d.to_check_in > 0 && { key: "checkin", n: d.to_check_in, href: `${base}#run`, warn: false },
    d.past_unmarked > 0 && { key: "unmarked", n: d.past_unmarked, href: `${base}/departures`, warn: true },
    manager && d.trips_without_departures.length > 0 && { key: "noDepartures", n: d.trips_without_departures.length, href: `${base}/departures`, warn: true },
  ].filter(Boolean) as { key: string; n: number; href: string; warn: boolean }[];
  const h = d.response_hours == null ? null : Number(d.response_hours);
  const speed = h == null ? null : h <= 1 ? "fast" : h <= 6 ? "ok" : "slow";
  return (
    <section aria-labelledby="todo-h" className="mb-6 grid gap-3 lg:grid-cols-[1.4fr_1fr]">
      <div className="rounded-card border border-line p-4">
        <h2 id="todo-h" className="mb-2 font-bold">{t("todo")}</h2>
        {items.length === 0 ? <p className="text-small text-success">✓ {t("allDone")}</p> : (
          <ul className="flex flex-col gap-2">
            {items.map((i) => (
              <li key={i.key}>
                <Link href={i.href} className={`flex items-center justify-between gap-3 rounded-control p-3 font-semibold hover:opacity-90 ${i.warn ? "bg-apricot-tint" : "bg-discovery-tint"}`}>
                  <span>{t(`items.${i.key}`, { n: i.n })}</span><span aria-hidden="true" className="rtl:-scale-x-100">→</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      {manager && (
        <div className="rounded-card border border-line p-4">
          <h2 className="mb-1 font-bold">{t("responseTitle")}</h2>
          {h == null ? <p className="text-small text-ink-muted">{t("responseNone")}</p> : (
            <>
              <p className={`text-h2 font-extrabold tabular-nums ${speed === "fast" ? "text-success" : speed === "ok" ? "text-discovery" : "text-warning"}`}>{t("hours", { n: h })}</p>
              <p className="text-small">{t(`speed.${speed}`)}</p>
              <p className="mt-1 text-[12px] text-ink-muted">{t("responseNote", { n: d.decided_count })}</p>
            </>
          )}
        </div>
      )}
    </section>
  );
}
