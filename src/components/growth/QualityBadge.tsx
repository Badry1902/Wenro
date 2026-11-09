import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { qualityScore, type TripQuality } from "@/lib/quality";

/** Score ring and the next things to add, each linking to the editor. */
export async function QualityBadge({ q, editHref }: { q: TripQuality; editHref: string }) {
  const t = await getTranslations("app.quality");
  const { score, missing } = qualityScore(q);
  const tone = score >= 85 ? "text-success" : score >= 60 ? "text-discovery" : "text-warning";
  return (
    <div className="flex w-full flex-wrap items-center gap-3 rounded-control bg-[#F7F8FB] p-3">
      <span className={`relative grid size-14 shrink-0 place-items-center rounded-full ${tone}`} role="img" aria-label={t("score", { n: score })}
        style={{ background: `conic-gradient(currentColor ${score * 3.6}deg, #E3E6EF 0deg)` }}>
        <span className="grid size-11 place-items-center rounded-full bg-[#F7F8FB] text-small font-extrabold text-ink tabular-nums">{score}</span>
      </span>
      <div className="min-w-0 flex-1 text-small">
        <b className="block">{score >= 85 ? t("great") : t("improve")}</b>
        {missing.length > 0 && (
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {missing.slice(0, 4).map((k) => (
              <li key={k}><Link href={k === "departures" ? editHref.replace(/\/experiences\/.*/, "/departures") : `${editHref}${k === "photos" || k === "video" ? "#photos" : k === "meeting" ? "#location" : ""}`}
                className="inline-flex rounded-full border border-line bg-white px-2.5 py-1 font-semibold hover:border-discovery hover:text-discovery">+ {t(`tips.${k}`)}</Link></li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
