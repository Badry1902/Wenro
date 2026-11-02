import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { rpc } from "@/lib/data/rpc";
import { dayKey } from "@/lib/pricing";
import { canManage, requireWorkspace } from "@/lib/workspaces";
import { Badge, Card, Empty, Flash, PageTitle, btn, field } from "@/components/ui";
import { createSlots, setSlot } from "../../../actions";

export const dynamic = "force-dynamic";

type OpSlot = { id: string; experience_id: string; title: string; starts_at: string; capacity: number; booked: number; status: string };
type OpExperience = { id: string; slug: string; status: string; booking_mode: string; title: string };
type Props = { params: Promise<{ locale: string; org: string }>; searchParams: Promise<{ w?: string; ok?: string; err?: string }> };

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7]; // ISO: Monday = 1
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const noon = (d: string) => new Date(`${d}T12:00:00Z`);

export default async function Departures({ params, searchParams }: Props) {
  const { locale, org } = await params;
  setRequestLocale(locale);
  const q = await searchParams;
  const ws = await requireWorkspace(locale, org, ["operator"]);
  const manager = canManage(ws);
  const t = await getTranslations("app.dep");
  const ta = await getTranslations("app");
  const format = await getFormatter();

  // Work in Hurghada calendar days: fetch a day of margin either side, then keep the 14 local days.
  const week = Math.max(0, Math.min(12, Number.parseInt(q.w ?? "0", 10) || 0));
  const today = dayKey(new Date().toISOString());
  const firstDay = addDays(today, week * 14);
  const lastDay = addDays(firstDay, 13);

  const [slotsAll, experiences] = await Promise.all([
    rpc<OpSlot[]>("operator_slots", {
      p_operator: org,
      p_from: new Date(Date.parse(`${firstDay}T00:00:00Z`) - 864e5).toISOString(),
      p_to: new Date(Date.parse(`${lastDay}T00:00:00Z`) + 2 * 864e5).toISOString(),
    }, "user"),
    manager ? rpc<OpExperience[]>("operator_experiences", { p_operator: org }, "user") : Promise.resolve([] as OpExperience[]),
  ]);
  const slots = slotsAll.filter((s) => dayKey(s.starts_at) >= firstDay && dayKey(s.starts_at) <= lastDay);
  const usable = experiences.filter((e) => e.status !== "archived");

  const byDay = new Map<string, OpSlot[]>();
  for (const s of slots) byDay.set(dayKey(s.starts_at), [...(byDay.get(dayKey(s.starts_at)) ?? []), s]);

  const back = `/app/o/${org}/departures`;
  const keep = week ? `w=${week}` : "";
  const hidden = (<><input type="hidden" name="locale" value={locale} /><input type="hidden" name="back" value={back} /><input type="hidden" name="keep" value={keep} /></>);
  const weekday = (n: number) => format.dateTime(new Date(Date.UTC(2024, 0, n)), { weekday: "short", timeZone: "UTC" }); // 2024-01-01 was a Monday

  return (
    <>
      <PageTitle
        title={t("title")}
        sub={`${format.dateTime(noon(firstDay), { day: "numeric", month: "short" })} – ${format.dateTime(noon(lastDay), { day: "numeric", month: "short", year: "numeric" })}`}
        actions={
          <nav aria-label={t("range")} className="flex gap-2">
            {week > 0 && <Link href={{ pathname: back, query: week > 1 ? { w: week - 1 } : {} }} className={btn.quiet}>{t("earlier")}</Link>}
            {week < 12 && <Link href={{ pathname: back, query: { w: week + 1 } }} className={btn.quiet}>{t("later")}</Link>}
          </nav>
        }
      />
      <Flash ok={q.ok} err={q.err} />

      {manager && (
        <Card title={t("addTitle")} className="mb-8">
          {usable.length === 0 ? <p className="text-ink-muted">{t("noExperiences")}</p> : (
            <form action={createSlots} className="grid gap-4 md:grid-cols-2">
              {hidden}
              <label className="flex flex-col gap-1.5 text-small font-bold md:col-span-2">{t("experience")}
                <select name="experience" required className={field}>
                  {usable.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-small font-bold">{t("from")}
                <input type="date" name="from" required min={today} defaultValue={today} className={field} />
              </label>
              <label className="flex flex-col gap-1.5 text-small font-bold">{t("to")}
                <input type="date" name="to" required min={today} defaultValue={dayKey(new Date(Date.now() + 30 * 864e5).toISOString())} className={field} />
              </label>
              <fieldset className="min-w-0 md:col-span-2">
                <legend className="mb-1.5 text-small font-bold">{t("weekdays")}</legend>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((d) => (
                    <label key={d} className="flex min-h-11 items-center gap-2 rounded-control border border-line px-3">
                      <input type="checkbox" name="weekday" value={d} defaultChecked className="h-5 w-5 accent-discovery" />{weekday(d)}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="flex flex-col gap-1.5 text-small font-bold">{t("times")}
                <input name="times" required dir="ltr" placeholder="08:30, 13:00" pattern="^\s*\d{2}:\d{2}(\s*[, ]\s*\d{2}:\d{2})*\s*$" className={field} />
                <span className="font-normal text-ink-muted">{t("timesHint")}</span>
              </label>
              <label className="flex flex-col gap-1.5 text-small font-bold">{t("capacity")}
                <input type="number" name="capacity" required min={1} max={500} defaultValue={20} className={field} />
                <span className="font-normal text-ink-muted">{t("capacityHint")}</span>
              </label>
              <div className="md:col-span-2"><button className={btn.primary}>{t("create")}</button></div>
            </form>
          )}
        </Card>
      )}

      {byDay.size === 0 ? <Empty>{t("none")}</Empty> : (
        <div className="flex flex-col gap-6">
          {[...byDay.entries()].map(([d, list]) => (
            <section key={d} aria-labelledby={`d-${d}`}>
              <h2 id={`d-${d}`} className="mb-2 font-bold">{format.dateTime(new Date(`${d}T12:00:00Z`), { weekday: "long", day: "numeric", month: "long" })}</h2>
              <ul className="divide-y divide-line rounded-card border border-line">
                {list.map((s) => {
                  const past = Date.parse(s.starts_at) <= Date.now();
                  return (
                    <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <div className="font-semibold"><span dir="ltr">{format.dateTime(new Date(s.starts_at), { hour: "2-digit", minute: "2-digit" })}</span> · {s.title}</div>
                        <div className="text-small text-ink-muted">{t("seats", { booked: s.booked, capacity: s.capacity })}</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge value={s.status} />
                        {manager && !past && s.status !== "cancelled" && (
                          <form action={setSlot} className="flex items-center gap-2">
                            {hidden}<input type="hidden" name="slot" value={s.id} />
                            <label className="sr-only" htmlFor={`cap-${s.id}`}>{t("capacityFor", { time: format.dateTime(new Date(s.starts_at), { hour: "2-digit", minute: "2-digit" }) })}</label>
                            <input id={`cap-${s.id}`} type="number" name="capacity" min={s.booked} max={500} defaultValue={s.capacity} className={`${field} w-20`} />
                            <select name="open" defaultValue={s.status === "open" ? "1" : "0"} aria-label={t("state")} className={field}>
                              <option value="1">{ta("status.open")}</option>
                              <option value="0">{ta("status.closed")}</option>
                            </select>
                            <button className={btn.quiet}>{t("save")}</button>
                          </form>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
      <p className="mt-8 text-small text-ink-muted">{t("weatherHint")} {ta("timezoneNote")}</p>
    </>
  );
}
