import "server-only";
import { createTranslator } from "next-intl";
import { loadMessages } from "@/i18n/merge";
import { routing } from "@/i18n/routing";
import { formatMoney } from "@/lib/money";

export type MessageKind =
  | "booking_confirmed" | "request_received" | "request_accepted" | "request_declined" | "request_expired"
  | "reconfirm" | "cancelled_by_guest" | "weather_cancelled" | "auto_cancelled" | "cancelled"
  | "operator_request" | "admin_alert";

export type BookingContext = {
  id: string; ref: string; status: string; starts_at: string; currency: "EUR" | "USD" | "EGP"; paid_minor: number;
  locale: string; transport: boolean; request_expires_at: string | null; free_cancel_hours: number | null;
  title: string | null; meeting_info: string | null; hotel: string | null; operator: string; operator_email: string | null;
  lines: { kind: string; quantity: number }[] | null;
  customer: { full_name: string; email: string; phone: string };
  sealed_link?: string | null;
};
export type AlertPayload = { date: string; bookings: { ref: string; starts_at: string; full_name: string; phone: string }[] };

export type Rendered = { subject: string; text: string; html: string; locale: string; dir: "ltr" | "rtl" };

const TZ = "Africa/Cairo";
// Messages are loaded at run time, so the translator is used untyped here.
type Tr = (key: string, values?: Record<string, string | number>) => string;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const supported = (l: string) => ((routing.locales as readonly string[]).includes(l) ? l : "en");

/** Operators and the WENRO team read Arabic by default (OPERATOR_EMAIL_LOCALE to change). */
export function staffLocale() {
  return supported(process.env.OPERATOR_EMAIL_LOCALE ?? "ar");
}

/**
 * Turns one queued message into an email in the reader's language.
 * `link` is the guest's voucher / manage page (null → the email tells them to keep the reference).
 */
export async function renderMessage(
  kind: MessageKind,
  opts: { locale: string; booking?: BookingContext | null; payload?: AlertPayload | null; link?: string | null; dashboardUrl?: string },
): Promise<Rendered> {
  const locale = supported(opts.locale);
  const messages = await loadMessages(locale);
  const t = createTranslator({ locale, messages, namespace: "email" }) as unknown as Tr;
  const tc = createTranslator({ locale, messages, namespace: "common" }) as unknown as Tr;
  const dir = locale === "ar" ? "rtl" : "ltr";
  const b = opts.booking ?? null;

  const when = (iso: string) =>
    new Intl.DateTimeFormat(locale, { timeZone: TZ, weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  const shortDate = (iso: string) => new Intl.DateTimeFormat(locale, { timeZone: TZ, day: "numeric", month: "short" }).format(new Date(iso));

  const vars: Record<string, string> = b ? { title: b.title ?? "WENRO", date: shortDate(b.starts_at), ref: b.ref, name: b.customer.full_name } : {};
  let subject: string;
  let intro: string;
  let button: string | null = null;
  const rows: [string, string][] = [];
  const extra: string[] = [];

  if (kind === "admin_alert") {
    const p = opts.payload!;
    subject = t("admin_alert.subject", { n: p.bookings.length });
    intro = t("admin_alert.intro");
    for (const x of p.bookings) rows.push([`${x.ref} · ${when(x.starts_at)}`, `${x.full_name} · ${x.phone}`]);
    button = opts.dashboardUrl ? t("admin_alert.button") : null;
  } else {
    if (!b) throw new Error(`message ${kind} needs a booking`);
    subject = t(`${kind}.subject`, vars);
    intro = t(`${kind}.intro`, { ...vars, hours: b.free_cancel_hours ?? 24 });

    const people = (b.lines ?? [])
      .filter((l) => ["adult", "child", "infant"].includes(l.kind) && l.quantity > 0)
      .map((l) => tc(`${l.kind === "adult" ? "adults" : l.kind === "child" ? "children" : "infants"}Count`, { n: l.quantity }))
      .join(", ");
    rows.push([t("labels.experience"), b.title ?? ""]);
    rows.push([t("labels.when"), `${when(b.starts_at)} (${t("labels.hurghadaTime")})`]);
    if (people) rows.push([t("labels.guests"), people]);
    if (kind !== "operator_request") {
      rows.push([t("labels.where"), b.transport && b.hotel ? t("labels.pickupAt", { hotel: b.hotel }) : (b.meeting_info ?? t("labels.meetingPointLater"))]);
    }
    rows.push([t("labels.reference"), b.ref]);

    const live = ["booking_confirmed", "request_accepted", "reconfirm", "request_received"].includes(kind);
    if (live && kind !== "operator_request") rows.push([t("labels.pay"), `${formatMoney({ minor: b.paid_minor, currency: b.currency }, locale)} · ${t("labels.cash")}`]);
    if (kind === "booking_confirmed" || kind === "request_accepted") extra.push(t("notes.voucher"), t("notes.freeCancel", { hours: b.free_cancel_hours ?? 24 }));
    if (kind === "request_received") extra.push(t("notes.requestWindow"));
    if (kind === "operator_request") button = opts.dashboardUrl ? t("operator_request.button") : null;
    else if (opts.link && kind !== "cancelled_by_guest") button = t(kind === "reconfirm" ? "reconfirm.button" : "buttons.view");
    if (!opts.link && kind !== "operator_request") extra.push(t("notes.keepRef", { ref: b.ref }));
    if (["request_declined", "request_expired", "auto_cancelled", "weather_cancelled", "cancelled_by_guest", "cancelled"].includes(kind)) {
      extra.push(t("notes.nothingToPay"));
    }
  }

  const href = kind === "admin_alert" || kind === "operator_request" ? opts.dashboardUrl ?? null : opts.link ?? null;
  const greeting = b && kind !== "operator_request" ? t("greeting", { name: b.customer.full_name }) : t("greetingTeam");
  const footer = kind === "operator_request" || kind === "admin_alert" ? t("footerTeam") : t("footer");

  const text = [
    greeting, "", intro, "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    ...(extra.length ? ["", ...extra] : []),
    ...(button && href ? ["", `${button}: ${href}`] : []),
    "", "—", footer,
  ].join("\n");

  const html = `<!doctype html><html lang="${locale}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(subject)}</title></head>
<body style="margin:0;background:#ffffff;font-family:${locale === "ar" ? "'IBM Plex Sans Arabic'," : ""}Manrope,Segoe UI,Arial,sans-serif;color:#232B45">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;text-align:${dir === "rtl" ? "right" : "left"}" dir="${dir}">
<tr><td style="padding:0 0 16px;font-family:'DM Serif Display',Georgia,serif;font-size:28px;color:#3046D9">wenro</td></tr>
<tr><td style="font-size:16px;line-height:1.55">
<p style="margin:0 0 12px">${esc(greeting)}</p>
<p style="margin:0 0 20px;font-size:18px;font-weight:700">${esc(intro)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E3E6EF;border-radius:12px">
${rows.map(([k, v], i) => `<tr><td style="padding:10px 14px;${i ? "border-top:1px solid #E3E6EF;" : ""}color:#5B6178;font-size:14px;width:38%;vertical-align:top">${esc(k)}</td><td style="padding:10px 14px;${i ? "border-top:1px solid #E3E6EF;" : ""}font-weight:600">${esc(v)}</td></tr>`).join("\n")}
</table>
${extra.map((e) => `<p style="margin:14px 0 0;font-size:14px;color:#5B6178">${esc(e)}</p>`).join("\n")}
${button && href ? `<p style="margin:24px 0 0"><a href="${esc(href)}" style="display:inline-block;background:#3046D9;color:#ffffff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:10px">${esc(button)}</a></p>` : ""}
<p style="margin:32px 0 0;font-size:12px;color:#8A90A6">${esc(footer)}</p>
</td></tr></table></td></tr></table></body></html>`;

  return { subject, text, html, locale, dir };
}

/** Prefilled WhatsApp text for the WENRO team's manual messages (until the WhatsApp API is connected). */
export async function whatsappText(kind: "reconfirm" | "hello", b: { locale: string; full_name: string; title: string; starts_at: string; ref: string }, link: string | null) {
  const locale = supported(b.locale);
  const t = createTranslator({ locale, messages: await loadMessages(locale), namespace: "email.whatsapp" }) as unknown as Tr;
  const time = new Intl.DateTimeFormat(locale, { timeZone: TZ, weekday: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(b.starts_at));
  return t(kind, { name: b.full_name, title: b.title, time, ref: b.ref, link: link ?? b.ref });
}
