import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { rpc } from "@/lib/data/rpc";
import { dayKey } from "@/lib/pricing";
import { formatMoney } from "@/lib/money";
import { requirePlatform } from "@/lib/workspaces";
import { adminCancelBooking } from "../../actions";
import { unseal } from "@/lib/messaging/seal";
import { manageLink } from "@/lib/messaging/deliver";
import { whatsappText } from "@/lib/messaging/render";
import { Badge, Empty, Flash, PageTitle, btn, field } from "@/components/ui";
import { Submit } from "@/components/Submit";

export const dynamic = "force-dynamic";

type Row = {
  id: string; ref: string; starts_at: string; status: string; execution_status: string; reconfirm_status: string;
  source: string; partner: string | null; operator: string; title: string; customer: string; phone: string; email: string;
  seats: number; currency: "EUR"; paid_minor: number; operator_net_minor: number; partner_commission_minor: number;
  platform_share_minor: number; created_at: string; locale: string;
};
type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ d?: string; s?: string; r?: string; span?: string; ok?: string; err?: string }> };

const STATUSES = ["pending_request", "confirmed", "cancelled", "expired", "declined"];
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export default async function AdminBookings({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const q = await searchParams;
  await requirePlatform(locale);
  const t = await getTranslations("app.adminBookings");
  const ts = await getTranslations("app.status");
  const format = await getFormatter();

  const day = q.d && DAY.test(q.d) ? q.d : null;
  const span = Math.min(90, Math.max(1, Number.parseInt(q.span ?? "7", 10) || 7));
  const status = STATUSES.includes(q.s ?? "") ? q.s! : null;
  const from = day ? new Date(Date.parse(`${day}T00:00:00Z`) - 864e5) : new Date(new Date().setUTCHours(0, 0, 0, 0) - 864e5);
  const to = day ? new Date(Date.parse(`${day}T00:00:00Z`) + 2 * 864e5) : new Date(from.getTime() + (span + 1) * 864e5);

  let rows = await rpc<Row[]>("admin_bookings", { p_from: from.toISOString(), p_to: to.toISOString(), p_status: status }, "user");
  if (day) rows = rows.filter((r) => dayKey(r.starts_at) === day);
  if (q.r === "sent") rows = rows.filter((r) => r.reconfirm_status === "sent" && r.status === "confirmed");
  const m = (minor: number, c: string) => formatMoney({ minor, currency: c as "EUR" }, locale);

  // Manual WhatsApp (until the WhatsApp API is connected): a prefilled message in the guest's language.
  // For confirmed trips in the next 48 h it asks to reconfirm and carries the guest's own manage link.
  const soon = (r: Row) => r.status === "confirmed" && r.execution_status === "scheduled" && Date.parse(r.starts_at) - Date.now() < 48 * 3600e3 && Date.parse(r.starts_at) > Date.now();
  const wa = new Map<string, string>();
  for (const r of rows.slice(0, 60)) {
    if (r.status !== "confirmed" && r.status !== "pending_request") continue;
    let link: string | null = null;
    if (soon(r)) {
      const sealed = await rpc<string | null>("sealed_link_for", { p_booking: r.id }, "user").catch(() => null);
      const token = unseal(sealed);
      link = token ? manageLink(r.locale, token) : null;
    }
    const text = await whatsappText(soon(r) && link ? "reconfirm" : "hello", { locale: r.locale, full_name: r.customer, title: r.title, starts_at: r.starts_at, ref: r.ref }, link);
    wa.set(r.id, `https://wa.me/${r.phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`);
  }

  return (
    <>
      <PageTitle title={t("title")} sub={t("count", { n: rows.length })} />
      <Flash ok={q.ok} err={q.err} />
      <form className="mb-6 flex flex-wrap items-end gap-3 rounded-card border border-line p-4">
        <label className="flex flex-col gap-1 text-small font-bold">{t("day")}<input type="date" name="d" defaultValue={day ?? ""} className={field} /></label>
        <label className="flex flex-col gap-1 text-small font-bold">{t("span")}
          <select name="span" defaultValue={String(span)} className={field}>
            {[7, 14, 30, 90].map((n) => <option key={n} value={n}>{t("days", { n })}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-small font-bold">{t("status")}
          <select name="s" defaultValue={status ?? ""} className={field}>
            <option value="">{t("all")}</option>
            {STATUSES.map((s) => <option key={s} value={s}>{ts(s)}</option>)}
          </select>
        </label>
        <label className="flex min-h-11 items-center gap-2 text-small font-bold"><input type="checkbox" name="r" value="sent" defaultChecked={q.r === "sent"} className="h-5 w-5 accent-discovery" />{t("notReconfirmed")}</label>
        <Submit className={btn.primary}>{t("apply")}</Submit>
      </form>

      {rows.length === 0 ? <Empty>{t("none")}</Empty> : (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => (
            <li key={r.id} className="rounded-card border border-line p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 font-bold">
                  <span dir="ltr">{r.ref}</span>
                  <Badge value={r.status} />
                  {r.execution_status !== "scheduled" && <Badge value={r.execution_status} />}
                  {r.status === "confirmed" && r.reconfirm_status !== "not_sent" && <span className="text-[12px] font-bold text-ink-muted">{t(`reconfirm.${r.reconfirm_status}`)}</span>}
                </div>
                <div className="text-small text-ink-muted">{format.dateTime(new Date(r.starts_at), { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
              </div>
              <div className="mt-1 text-[14px]">{r.title} · {r.operator} · {t("seats", { n: r.seats })}</div>
              <div className="mt-1 text-small text-ink-muted">
                {r.customer} · <span dir="ltr">{r.phone}</span> · <span dir="ltr">{r.email}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
              {wa.has(r.id) && (
                <a href={wa.get(r.id)} target="_blank" rel="noopener noreferrer" className="btn-press inline-flex min-h-11 items-center rounded-control bg-[#1F7A4D] px-4 text-small font-bold text-white">
                  {soon(r) && r.reconfirm_status !== "confirmed" ? t("waReconfirm") : t("waMessage")}
                </a>
              )}
              {(r.status === "confirmed" || r.status === "pending_request") && r.execution_status === "scheduled" && (
                <details className="relative">
                  <summary className={`${btn.quiet} cursor-pointer list-none text-small`}>{t("cancel")}</summary>
                  <form action={adminCancelBooking} className="popover-panel absolute start-0 z-10 mt-2 flex w-72 flex-col gap-2 rounded-card border border-line bg-surface p-4 shadow-lg">
                    <input type="hidden" name="locale" value={locale} /><input type="hidden" name="back" value="/app/admin/bookings" />
                    <input type="hidden" name="keep" value={new URLSearchParams(Object.entries({ d: q.d ?? "", s: q.s ?? "", span: q.span ?? "" }).filter(([, x]) => x)).toString()} />
                    <input type="hidden" name="booking" value={r.id} />
                    <p className="text-[14px]">{t("cancelConfirm", { ref: r.ref })}</p>
                    <Submit className={btn.danger}>{t("cancelYes")}</Submit>
                  </form>
                </details>
              )}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-small tabular-nums">
                <span>{t("paid")}: <b>{m(r.paid_minor, r.currency)}</b></span>
                <span>{t("operator")}: {m(r.operator_net_minor, r.currency)}</span>
                <span>{t("partner")}: {m(r.partner_commission_minor, r.currency)}{r.partner ? ` (${r.partner})` : ""}</span>
                <span>WENRO: {m(r.platform_share_minor, r.currency)}</span>
                <span>{t(`source.${r.source}`)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
