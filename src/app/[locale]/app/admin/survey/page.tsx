import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { rpc } from "@/lib/data/rpc";
import { requirePlatform } from "@/lib/workspaces";
import { siteUrl } from "@/lib/env";
import { Card, Empty, Flash, PageTitle, Stat, StatRow, btn } from "@/components/ui";
import { CopyButton } from "@/components/CopyButton";
import { Submit } from "@/components/Submit";
import { QUESTIONS, SURVEY, SURVEY_ID, surveyLang, type Answers, type Question } from "@/lib/survey";
import { deleteSurveyResponse } from "./actions";

export const dynamic = "force-dynamic";

type Row = { id: string; locale: string; source: string | null; answers: Answers; other: Record<string, string>; contact: string | null; created_at: string };

/** Share of answers per option, most chosen first (options nobody picked stay, at 0). */
function tally(q: Extract<Question, { kind: "one" | "many" }>, rows: Row[]) {
  const counts = new Map(q.options.map((o) => [o.id, 0]));
  let n = 0;
  for (const r of rows) {
    const v = r.answers[q.id];
    const ids = Array.isArray(v) ? v : typeof v === "string" ? [v] : [];
    if (ids.length || r.other[q.id]) n++;
    for (const id of ids) if (counts.has(id)) counts.set(id, counts.get(id)! + 1);
  }
  return { n, list: q.options.map((o) => ({ o, c: counts.get(o.id)! })).sort((a, b) => b.c - a.c) };
}

function average(q: Extract<Question, { kind: "scale" }>, rows: Row[]) {
  return q.rows.map((row) => {
    const vals = rows.map((r) => (r.answers[q.id] as Record<string, number> | undefined)?.[row.id]).filter((x): x is number => typeof x === "number");
    return { row, n: vals.length, avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0 };
  }).sort((a, b) => b.avg - a.avg);
}

export default async function AdminSurvey({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const q = await searchParams;
  const ws = await requirePlatform(locale, "survey");
  const t = await getTranslations("app.survey");
  const format = await getFormatter();
  const rows = await rpc<Row[]>("admin_survey", { p_survey: SURVEY_ID }, "user");
  const lang = surveyLang(locale);
  const canDelete = ws.role === "owner" || ws.role === "ops";
  const week = rows.filter((r) => Date.parse(r.created_at) > Date.now() - 7 * 86400_000).length;
  const contacts = rows.filter((r) => r.contact);
  const pct = (c: number, n: number) => (n ? Math.round((c / n) * 100) : 0);
  const day = (s: string) => format.dateTime(new Date(s), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Cairo" });
  const hidden = <input type="hidden" name="locale" value={locale} />;

  return (
    <>
      <PageTitle title={t("title")} sub={t("sub")} />
      <Flash ok={q.ok} err={q.err} />

      <Card title={t("shareTitle")} className="mb-6">
        <p className="mb-3 text-small text-ink-muted">{t("shareHint")}</p>
        <div className="flex flex-col gap-2">
          {(["en", "ar"] as const).map((l) => (
            <div key={l} className="flex flex-wrap items-center gap-2">
              <code className="min-w-0 flex-1 select-all break-all rounded-control bg-muted px-3 py-2.5 text-small" dir="ltr">{`${siteUrl()}/${l}/survey?src=whatsapp`}</code>
              <CopyButton text={`${siteUrl()}/${l}/survey?src=whatsapp`} label={t("copy")} done={t("copied")} />
            </div>
          ))}
        </div>
      </Card>

      <StatRow cols={3}>
        <Stat label={t("total")} value={rows.length} pin />
        <Stat label={t("thisWeek")} value={week} />
        <Stat label={t("contacts")} value={contacts.length} />
      </StatRow>

      {rows.length === 0 ? <div className="mt-6"><Empty>{t("none")}</Empty></div> : (
        <div className="mt-6 flex flex-col gap-6">
          {rows.length < 20 && <p className="rounded-card bg-warning-tint p-3 text-small font-semibold text-warning">{t("small", { n: rows.length })}</p>}
          {SURVEY.map((s) => (
            <Card key={s.id} title={s.title[lang]}>
              <div className="flex flex-col gap-7">
                {s.questions.map((qq) => {
                  if (qq.kind === "one" || qq.kind === "many") {
                    const { n, list } = tally(qq, rows);
                    const others = rows.map((r) => r.other[qq.id]).filter(Boolean).slice(0, 30);
                    return (
                      <section key={qq.id}>
                        <h3 className="font-semibold">{qq.q[lang]}</h3>
                        <p className="mb-2 text-[12px] text-ink-muted">{t("answeredBy", { n })}{qq.kind === "many" ? ` · ${t("multi")}` : ""}</p>
                        <ul className="flex flex-col gap-1.5">
                          {list.map(({ o, c }) => (
                            <li key={o.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 text-small">
                              <span className="min-w-0 truncate">{o[lang]}</span>
                              <span className="tabular-nums text-ink-muted">{c} · {pct(c, n)}%</span>
                              <span className="col-span-2 h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                                <span className="block h-full rounded-full bg-discovery" style={{ width: `${pct(c, n)}%` }} />
                              </span>
                            </li>
                          ))}
                        </ul>
                        {others.length > 0 && (
                          <details className="mt-2 text-small"><summary className="cursor-pointer font-semibold text-link">{t("otherAnswers", { n: others.length })}</summary>
                            <ul className="mt-2 flex list-disc flex-col gap-1 ps-5 text-ink-muted">{others.map((x, i) => <li key={i}>{x}</li>)}</ul>
                          </details>
                        )}
                      </section>
                    );
                  }
                  if (qq.kind === "scale") {
                    return (
                      <section key={qq.id}>
                        <h3 className="font-semibold">{qq.q[lang]}</h3>
                        <p className="mb-2 text-[12px] text-ink-muted">{t("scaleNote")}</p>
                        <ul className="flex flex-col gap-1.5">
                          {average(qq, rows).map(({ row, n, avg }) => (
                            <li key={row.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 text-small">
                              <span className="min-w-0 truncate">{row[lang]}</span>
                              <span className="tabular-nums text-ink-muted">{n ? avg.toFixed(1) : "–"} / 5</span>
                              <span className="col-span-2 h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                                <span className="block h-full rounded-full bg-apricot" style={{ width: `${(avg / 5) * 100}%` }} />
                              </span>
                            </li>
                          ))}
                        </ul>
                      </section>
                    );
                  }
                  const texts = rows.filter((r) => typeof r.answers[qq.id] === "string").slice(0, 40);
                  return (
                    <section key={qq.id}>
                      <h3 className="font-semibold">{qq.q[lang]}</h3>
                      <p className="mb-2 text-[12px] text-ink-muted">{t("answeredBy", { n: texts.length })}</p>
                      {texts.length === 0 ? <p className="text-small text-ink-muted">–</p> : (
                        <ul className="flex flex-col gap-2">
                          {texts.map((r) => (
                            <li key={r.id} className="rounded-control bg-muted px-3 py-2 text-small" dir="auto">
                              {String(r.answers[qq.id])}
                              <span className="ms-2 text-[11px] text-ink-muted">{day(r.created_at)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  );
                })}
              </div>
            </Card>
          ))}

          <Card title={t("contactsTitle")}>
            <p className="mb-3 text-small text-ink-muted">{t("contactsHint")}</p>
            {contacts.length === 0 ? <p className="text-small text-ink-muted">–</p> : (
              <ul className="flex flex-col divide-y divide-line">
                {contacts.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-3 py-2.5 text-small">
                    <span className="min-w-0 flex-1 select-all break-all font-semibold" dir="ltr">{r.contact}</span>
                    <span className="text-ink-muted">{day(r.created_at)}{r.source ? ` · ${r.source}` : ""}</span>
                    {canDelete && (
                      <form action={deleteSurveyResponse}>
                        {hidden}<input type="hidden" name="id" value={r.id} />
                        <Submit className={btn.quiet}>{t("delete")}</Submit>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
      <p className="mt-6 text-[12px] text-ink-muted">{t("questionsCount", { n: QUESTIONS.length })} · {SURVEY_ID}</p>
    </>
  );
}
