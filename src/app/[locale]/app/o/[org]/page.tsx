import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { rpc } from "@/lib/data/rpc";
import { dayKey } from "@/lib/pricing";
import { formatMoney } from "@/lib/money";
import { canManage, requireWorkspace } from "@/lib/workspaces";
import { TripTable, type TripVisits } from "@/components/VisitsPanel";
import { Badge, Empty, Flash, PageTitle, btn, field } from "@/components/ui";
import { Submit } from "@/components/Submit";
import { QrScanner } from "@/components/QrScanner";
import { cancelSlot, checkIn, checkInByCode, decideRequest, noShow } from "../../actions";

export const dynamic = "force-dynamic";

type OpBooking = {
  booking_id: string; ref: string; experience_id: string; starts_at: string; status: string; execution_status: string;
  reconfirm_status: string; adults: number; children: number; infants: number; is_private: boolean; hotel: string | null;
  zone: string | null; transport: boolean; room: string | null; customer_name: string; customer_phone: string | null;
  currency: "EUR" | "USD" | "EGP"; paid_minor: number | null; operator_net_minor: number | null;
};
type OpSlot = { id: string; experience_id: string; title: string; starts_at: string; capacity: number; booked: number; status: string };

type Props = { params: Promise<{ locale: string; org: string }>; searchParams: Promise<{ d?: string; ok?: string; err?: string; hl?: string }> };

const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);

export default async function OperatorToday({ params, searchParams }: Props) {
  const { locale, org } = await params;
  setRequestLocale(locale);
  const q = await searchParams;
  const ws = await requireWorkspace(locale, org, ["operator"]);
  const manager = canManage(ws);
  const t = await getTranslations("app.op");
  const ta = await getTranslations("app");
  const format = await getFormatter();

  const today = dayKey(new Date().toISOString());
  const day = q.d && /^\d{4}-\d{2}-\d{2}$/.test(q.d) ? q.d : today;
  const from = new Date(Date.parse(`${day}T00:00:00Z`) - 864e5).toISOString();
  const to = new Date(Date.parse(`${day}T00:00:00Z`) + 2 * 864e5).toISOString();

  const [bookingsAll, slotsAll, upcoming, views] = await Promise.all([
    rpc<OpBooking[]>("operator_bookings", { p_operator: org, p_from: from, p_to: to }, "user"),
    rpc<OpSlot[]>("operator_slots", { p_operator: org, p_from: from, p_to: to }, "user"),
    rpc<OpBooking[]>("operator_bookings", { p_operator: org, p_from: new Date().toISOString(), p_to: new Date(Date.now() + 90 * 864e5).toISOString() }, "user"),
    ["owner", "manager"].includes(ws.role) ? rpc<TripVisits>("operator_visits", { p_operator: org, p_days: 7 }, "user").catch(() => [] as TripVisits) : Promise.resolve([] as TripVisits),
  ]);
  // The run sheet lists who is coming; cancelled, declined and expired bookings stay in the history only.
  const bookings = bookingsAll.filter((b) => dayKey(b.starts_at) === day && (b.status === "confirmed" || b.status === "pending_request"));
  const slots = slotsAll.filter((s) => dayKey(s.starts_at) === day);
  const requests = upcoming.filter((b) => b.status === "pending_request");
  const back = `/app/o/${org}`;
  const keep = `d=${day}`;
  const hidden = (<><input type="hidden" name="locale" value={locale} /><input type="hidden" name="back" value={back} /><input type="hidden" name="keep" value={keep} /></>);
  const time = (iso: string) => format.dateTime(new Date(iso), { hour: "2-digit", minute: "2-digit" });
  const started = (iso: string) => Date.parse(iso) <= Date.now();

  return (
    <>
      <PageTitle
        title={t("todayTitle")}
        sub={format.dateTime(new Date(`${day}T12:00:00Z`), { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        actions={
          <nav aria-label={t("dayNav")} className="flex gap-2">
            <Link href={{ pathname: back, query: { d: addDays(day, -1) } }} className={btn.quiet}>{t("prev")}</Link>
            {day !== today && <Link href={back} className={btn.quiet}>{t("today")}</Link>}
            <Link href={{ pathname: back, query: { d: addDays(day, 1) } }} className={btn.quiet}>{t("next")}</Link>
          </nav>
        }
      />
      <Flash ok={q.ok} err={q.err} />

      {/* The day at a glance, and the things operators do most */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: t("kDepartures"), value: slots.filter((x) => x.status !== "cancelled").length },
          { label: t("kGuests"), value: bookings.filter((x) => x.status === "confirmed").reduce((n, x) => n + x.adults + x.children + x.infants, 0) },
          { label: t("kPickups"), value: bookings.filter((x) => x.status === "confirmed" && x.transport).length },
          { label: t("kRequests"), value: requests.length, warn: requests.length > 0 },
        ].map((k) => (
          <div key={k.label} className={`rounded-card border p-4 ${k.warn ? "border-apricot bg-apricot-tint" : "border-line"}`}>
            <div className="text-small font-semibold text-ink-muted">{k.label}</div>
            <div className="mt-1 text-[26px] font-extrabold leading-tight tabular-nums">{k.value}</div>
          </div>
        ))}
      </div>
      {manager && (
        <nav aria-label={t("quick")} className="mb-6 flex flex-wrap gap-2">
          <Link href={`${back}/departures`} className={btn.quiet}>{t("qDepartures")}</Link>
          <Link href={`${back}/experiences/new`} className={btn.quiet}>{t("qExperience")}</Link>
          {["owner", "manager"].includes(ws.role) && <Link href={`${back}/money`} className={btn.quiet}>{t("qMoney")}</Link>}
          {["owner", "manager"].includes(ws.role) && <Link href={`${back}/team`} className={btn.quiet}>{t("qTeam")}</Link>}
        </nav>
      )}

      <section className="mb-8 flex flex-wrap items-end gap-3 rounded-card border border-line p-4">
        <form action={checkInByCode} className="flex flex-wrap items-end gap-2">
          {hidden}
          <label className="flex flex-col gap-1 text-small font-bold">{t("scanLabel")}
            <input id="qr-code" name="code" autoComplete="off" dir="ltr" placeholder={t("scanPlaceholder")} className={`${field} w-72 max-w-full`} />
          </label>
          <Submit className={btn.primary}>{t("checkIn")}</Submit>
        </form>
        <QrScanner label={t("scanCamera")} stopLabel={t("scanStop")} onCodeField="qr-code" />
      </section>

      {requests.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-h3 font-bold">{t("requests", { n: requests.length })}</h2>
          <ul className="flex flex-col gap-2">
            {requests.map((b) => (
              <li key={b.booking_id} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-apricot bg-apricot-tint p-4">
                <div>
                  <div className="font-bold">{b.ref} · {format.dateTime(new Date(b.starts_at), { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                  <div className="text-small">{b.customer_name} · {t("people", { a: b.adults, c: b.children, i: b.infants })}</div>
                </div>
                {manager && (
                  <div className="flex gap-2">
                    <form action={decideRequest}>{hidden}<input type="hidden" name="booking" value={b.booking_id} /><input type="hidden" name="accept" value="1" /><Submit className={btn.primary}>{t("accept")}</Submit></form>
                    <form action={decideRequest}>{hidden}<input type="hidden" name="booking" value={b.booking_id} /><input type="hidden" name="accept" value="0" /><Submit className={btn.quiet}>{t("decline")}</Submit></form>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {slots.length === 0 ? <Empty>{t("noDepartures")}</Empty> : (
        <div className="flex flex-col gap-8">
          {slots.map((s) => {
            const list = bookings.filter((b) => b.starts_at === s.starts_at && b.experience_id === s.experience_id);
            const people = list.filter((b) => b.status === "confirmed").reduce((n, b) => n + b.adults + b.children + b.infants, 0);
            return (
              <section key={s.id} aria-labelledby={`s-${s.id}`} className="rounded-card border border-line">
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-[#F7F8FC] p-4">
                  <div>
                    <h2 id={`s-${s.id}`} className="text-h3 font-bold"><span dir="ltr">{time(s.starts_at)}</span> · {s.title}</h2>
                    <div className="text-small text-ink-muted">{t("seats", { booked: s.booked, capacity: s.capacity })} · {t("guests", { n: people })}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge value={s.status} />
                    {manager && s.status !== "cancelled" && !started(s.starts_at) && (
                      <details className="relative">
                        <summary className={`${btn.quiet} cursor-pointer list-none`}>{t("weather")}</summary>
                        <form action={cancelSlot} className="popover-panel absolute end-0 z-10 mt-2 flex w-72 flex-col gap-2 rounded-card border border-line bg-surface p-4 shadow-lg">
                          {hidden}<input type="hidden" name="slot" value={s.id} />
                          <p className="text-[14px]">{t("weatherConfirm", { n: list.filter((b) => b.status === "confirmed" || b.status === "pending_request").length })}</p>
                          <Submit className={btn.danger}>{t("weatherButton")}</Submit>
                        </form>
                      </details>
                    )}
                  </div>
                </header>
                {list.length === 0 ? <p className="p-4 text-ink-muted">{t("noGuests")}</p> : (
                  <ul className="divide-y divide-line">
                    {list.map((b) => (
                      <li key={b.booking_id} className={`flex flex-wrap items-center justify-between gap-3 p-4 ${q.hl === b.booking_id ? "row-flash" : ""}`}>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 font-bold">
                            {b.customer_name}<span className="text-small font-normal text-ink-muted" dir="ltr">{b.ref}</span>
                            <Badge value={b.execution_status === "scheduled" ? b.status : b.execution_status} />
                            {b.reconfirm_status === "confirmed" && <span className="text-[12px] font-bold text-success">{t("reconfirmed")}</span>}
                          </div>
                          <div className="text-[14px]">{t("people", { a: b.adults, c: b.children, i: b.infants })}
                            {b.transport ? <> · {t("pickupAt", { hotel: b.hotel ?? "" })}{b.room ? ` · ${t("room", { room: b.room })}` : ""}</> : <> · {t("meetingPoint")}</>}
                          </div>
                          <div className="text-small text-ink-muted">
                            {b.customer_phone
                              ? <a href={`https://wa.me/${b.customer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(t("waText", { name: b.customer_name, operator: ws.name.replace(/^\[DEMO\]\s*/, ""), ref: b.ref, time: time(b.starts_at) }))}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-discovery" dir="ltr">{b.customer_phone}</a>
                              : t("phoneHidden")}
                            {manager && b.paid_minor != null && <> · {t("collect", { amount: formatMoney({ minor: b.paid_minor, currency: b.currency }, locale) })}</>}
                          </div>
                        </div>
                        {b.status === "confirmed" && b.execution_status === "scheduled" && (
                          <div className="flex gap-2">
                            <form action={checkIn}>{hidden}<input type="hidden" name="booking" value={b.booking_id} /><input type="hidden" name="hl" value={b.booking_id} /><Submit className={btn.primary}>{t("checkIn")}</Submit></form>
                            {started(b.starts_at) && <form action={noShow}>{hidden}<input type="hidden" name="booking" value={b.booking_id} /><input type="hidden" name="hl" value={b.booking_id} /><Submit className={btn.quiet}>{t("noShow")}</Submit></form>}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
      <p className="mt-8 text-small text-ink-muted">{ta("timezoneNote")}</p>
      {views.length > 0 && (
        <section aria-labelledby="op-views" className="mt-10 rounded-card border border-line p-5">
          <h2 id="op-views" className="mb-1 font-bold">{ta("visits.opTitle")}</h2>
          <p className="mb-3 text-small text-ink-muted">{ta("visits.opSub")}</p>
          <TripTable rows={views} />
        </section>
      )}
    </>
  );
}
