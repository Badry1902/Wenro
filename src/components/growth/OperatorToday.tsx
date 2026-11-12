import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Pin, Stat, TaskList } from "../ui";

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
    <section aria-label={t("todo")} className="mb-6 grid items-start gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <TaskList title={t("todo")}>
        {items.length === 0 ? <p className="px-4 py-3 text-[14px] text-ink-muted">{t("allDone")}</p> : items.map((i) => (
          <Link key={i.key} href={i.href} className="flex min-h-12 items-center gap-3 px-4 py-2 transition-colors duration-150 hover:bg-[#F6F5F1]">
            <span className="grid w-3 shrink-0 place-items-center">{i.warn && <Pin />}</span>
            <span className="flex-1">{t(`items.${i.key}`, { n: i.n })}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true" className="shrink-0 text-ink-muted/60 rtl:-scale-x-100"><path d="M9 6l6 6-6 6" /></svg>
          </Link>
        ))}
      </TaskList>
      {manager && (
        <div className="rounded-card border border-line bg-surface p-5">
          <Stat label={t("responseTitle")} value={h == null ? "—" : t("hours", { n: h })}
            note={h == null ? t("responseNone") : <><span className={speed === "fast" ? "text-success" : speed === "slow" ? "text-warning" : "text-ink"}>{t(`speed.${speed}`)}</span><span className="mt-1 block">{t("responseNote", { n: d.decided_count })}</span></>} />
        </div>
      )}
    </section>
  );
}
