import "server-only";
import { createTranslator } from "next-intl";
import { loadMessages } from "@/i18n/merge";
import { routing } from "@/i18n/routing";
import { siteUrl } from "@/lib/env";
import type { BookingContext } from "./render";
import type { SendResult } from "./send";

/**
 * WhatsApp trip details through the official WhatsApp Business Cloud API (Meta).
 * Business-started messages must use templates approved by Meta, so we send two templates with numbered
 * placeholders (see docs/whatsapp-templates.md):
 *   WHATSAPP_TEMPLATE_GUEST    (default "wenro_trip_guest")    7 body values
 *   WHATSAPP_TEMPLATE_OPERATOR (default "wenro_trip_operator") 8 body values
 * Needs WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID (Vercel → Environment Variables). Without them nothing is
 * sent: the text is printed to the server log and the message is marked "logged".
 */
export type WaContext = BookingContext & {
  title_ar?: string | null; operator_phone?: string | null; meeting_place?: string | null;
  meeting_lat?: number | null; meeting_lng?: number | null; room?: string | null;
};

/** Phone as WhatsApp wants it: digits with country code, no plus. Egyptian local numbers (01…) get +20. */
export function waNumber(raw: string | null | undefined) {
  if (!raw) return null;
  let d = raw.replace(/[^\d+]/g, "");
  if (d.startsWith("00")) d = `+${d.slice(2)}`;
  if (/^01\d{9}$/.test(d)) d = `+2${d}`;
  if (!d.startsWith("+")) return null;
  d = d.slice(1).replace(/^(\d{1,4})0(\d{8,})$/, "$1$2"); // "+20 010…" typed with the trunk zero
  return d.length >= 8 && d.length <= 15 ? d : null;
}

const TZ = "Africa/Cairo";
const LANGS = () => (process.env.WHATSAPP_TEMPLATE_LANGS ?? "ar,en").split(",").map((s) => s.trim()).filter(Boolean);

export async function buildWhatsApp(kind: string, recipient: "guest" | "operator", b: WaContext, locale: string, link: string | null) {
  const l = (routing.locales as readonly string[]).includes(locale) ? locale : "en";
  const t = createTranslator({ locale: l, messages: await loadMessages(l), namespace: "whatsapp" }) as unknown as (k: string, v?: Record<string, string | number>) => string;
  const when = new Intl.DateTimeFormat(l, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(new Date(b.starts_at));
  const q = (k: string) => b.lines?.find((x) => x.kind === k)?.quantity ?? 0;
  const guests = [q("adult") && t("adults", { n: q("adult") }), q("child") && t("children", { n: q("child") }), q("infant") && t("infants", { n: q("infant") })].filter(Boolean).join(" · ");
  const map = b.meeting_lat != null && b.meeting_lng != null ? `https://maps.google.com/?q=${b.meeting_lat},${b.meeting_lng}` : null;
  const meeting = b.transport && b.hotel ? t("pickup", { hotel: b.hotel }) : [b.meeting_place, map].filter(Boolean).join(" · ") || t("meetingSoon");
  const head = t(`head.${kind}`);
  let values: string[];
  if (recipient === "guest") {
    values = [head, b.customer.full_name.split(" ")[0], b.title ?? "", when, guests, meeting, link ?? `${siteUrl()} · ${b.ref}`];
  } else {
    values = [head, b.ref, b.title_ar || b.title || "", when, guests, b.customer.full_name, b.customer.phone,
      b.transport && b.hotel ? `${b.hotel}${b.room ? ` · ${b.room}` : ""}` : t("atMeeting")];
  }
  const text = t(recipient === "guest" ? "guestText" : "operatorText", Object.fromEntries(values.map((v, i) => [`v${i + 1}`, v])));
  const lang = LANGS().includes(l) ? l : LANGS().includes("en") ? "en" : LANGS()[0];
  return { values, text, lang };
}

export async function sendWhatsApp(to: string, recipient: "guest" | "operator", msg: { values: string[]; text: string; lang: string }): Promise<SendResult> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) {
    console.info(`[whatsapp:logged] to=${to.slice(0, 4)}… ${msg.text.split("\n")[0]}`);
    return { status: "logged" };
  }
  const template = recipient === "guest" ? process.env.WHATSAPP_TEMPLATE_GUEST ?? "wenro_trip_guest" : process.env.WHATSAPP_TEMPLATE_OPERATOR ?? "wenro_trip_operator";
  try {
    const res = await fetch(`https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION ?? "v21.0"}/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp", to, type: "template",
        template: {
          name: template, language: { code: msg.lang },
          // WhatsApp rejects new lines and long runs of spaces inside template values
          components: [{ type: "body", parameters: msg.values.map((v) => ({ type: "text", text: (v || "-").replace(/\s+/g, " ").slice(0, 900) })) }],
        },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await res.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message?: string; code?: number } };
    if (!res.ok) return { status: "failed", error: `${res.status} ${body.error?.code ?? ""} ${body.error?.message ?? ""}`.trim() };
    return { status: "sent", providerId: body.messages?.[0]?.id };
  } catch (e) {
    return { status: "failed", error: e instanceof Error ? e.message : "send_error" };
  }
}
