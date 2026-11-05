import { getFormatter, getTranslations } from "next-intl/server";
import type { ReviewSummary } from "@/lib/data/types";
import { IconCheck, IconStar } from "../Icons";

export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex text-apricot" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => <IconStar key={n} size={size} filled={n <= Math.round(value)} className={n <= Math.round(value) ? "" : "text-[#D5D8E2]"} />)}
    </span>
  );
}

/**
 * Guest reviews on a trip page. Only reviews written by guests whose trip was checked in, through their own
 * booking link, and published by the WENRO team. Nothing is shown until the first one exists.
 */
export async function ReviewsSection({ data, id = "reviews" }: { data: ReviewSummary; id?: string }) {
  const t = await getTranslations("reviews");
  const format = await getFormatter();
  if (!data.count) {
    return (
      <section aria-labelledby={id} className="border-t border-line py-7">
        <h2 id={id} className="mb-2 text-h3 font-bold">{t("title")}</h2>
        <p className="text-ink-muted">{t("none")}</p>
      </section>
    );
  }
  const avg = Number(data.average ?? 0);
  return (
    <section aria-labelledby={id} className="border-t border-line py-7" id="reviews-list">
      <h2 id={id} className="mb-4 text-h3 font-bold">{t("title")}</h2>
      <div className="mb-6 flex flex-wrap items-center gap-6 rounded-card bg-apricot-tint p-5">
        <div className="text-center">
          <div className="text-[40px] font-extrabold leading-none tabular-nums">{avg.toFixed(1)}</div>
          <Stars value={avg} size={18} />
          <div className="mt-1 text-small text-ink-muted">{t("count", { n: data.count })}</div>
        </div>
        <ul className="flex min-w-[200px] flex-1 flex-col gap-1" aria-label={t("breakdown")}>
          {[5, 4, 3, 2, 1].map((s) => {
            const n = Number(data.stars[String(s)] ?? 0);
            return (
              <li key={s} className="flex items-center gap-2 text-small">
                <span className="w-3 tabular-nums">{s}</span><IconStar size={13} className="text-apricot" />
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-white"><span className="block h-full rounded-full bg-apricot" style={{ width: `${(n / data.count) * 100}%` }} /></span>
                <span className="w-6 text-end tabular-nums text-ink-muted">{n}</span>
              </li>
            );
          })}
        </ul>
      </div>
      <ul className="grid gap-4 md:grid-cols-2">
        {data.items.map((r) => (
          <li key={r.id} className="flex flex-col gap-2 rounded-card border border-line p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <span className="grid size-9 place-items-center rounded-full bg-discovery-tint font-bold text-discovery" aria-hidden="true">{r.author.slice(0, 1).toUpperCase()}</span>
                <span><b className="block leading-tight">{r.author}</b>
                  <span className="text-[12px] text-ink-muted">{t("travelled", { date: format.dateTime(new Date(r.trip_date), { month: "long", year: "numeric" }) })}</span></span>
              </span>
              <span className="flex flex-col items-end gap-0.5"><Stars value={r.rating} /><span className="sr-only">{t("outOf", { n: r.rating })}</span></span>
            </div>
            {r.body && <p className="whitespace-pre-line text-[15px]" lang={r.locale}>{r.body}</p>}
            <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-success"><IconCheck size={13} />{t("verified")}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-small text-ink-muted">{t("policy")}</p>
    </section>
  );
}
