import "server-only";
import webpush from "web-push";
import { createTranslator } from "next-intl";
import { rpc } from "@/lib/data/rpc";
import { siteUrl } from "@/lib/env";
import { loadMessages } from "@/i18n/merge";

/**
 * Push alerts to phones and computers (Web Push). Needs NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY
 * in Vercel; without them nothing is sent and the in-app bell still works.
 */
export function pushConfigured() {
  return !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

type Pending = { id: number; kind: string; params: Record<string, string | number | null>; link: string | null; org: string | null;
  devices: { endpoint: string; p256dh: string; auth: string; locale: string }[] | null };

/** Sends the alerts created in the last minutes. Safe to call often and in parallel (each alert is taken once). */
export async function dispatchPushes() {
  if (!pushConfigured()) return 0;
  webpush.setVapidDetails(`mailto:${process.env.PLATFORM_ALERT_EMAIL ?? "noreply@wenro.app"}`, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  let list: Pending[] = [];
  try { list = await rpc<Pending[]>("pending_pushes", {}, "service"); } catch (e) { console.error("pending_pushes", e); return 0; }
  const translators = new Map<string, Awaited<ReturnType<typeof makeT>>>();
  let sent = 0;
  for (const n of list) {
    for (const d of n.devices ?? []) {
      let t = translators.get(d.locale);
      if (!t) { t = await makeT(d.locale); translators.set(d.locale, t); }
      const p = n.params ?? {};
      const vals = { title: String(p.title ?? ""), ref: String(p.ref ?? ""), when: typeof p.starts_at === "string" ? new Date(p.starts_at).toLocaleString(d.locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Cairo" }) : "",
        seats: Number(p.seats ?? 0), rating: Number(p.rating ?? 0), name: String(p.name ?? ""), month: String(p.month ?? "").slice(0, 7),
        amount: p.currency ? `${(Number(p.amount_minor ?? p.due_minor ?? p.commission_minor ?? 0) / 100).toFixed(2)} ${p.currency}` : "" };
      const body = t.has(`kinds.${n.kind}`) ? t(`kinds.${n.kind}` as never, vals as never) : n.kind;
      const payload = JSON.stringify({ title: n.org ? `WENRO · ${n.org}` : "WENRO", body, url: `${siteUrl()}/${d.locale}${n.link ?? "/app/notifications"}`, tag: `n${n.id}` });
      try { await webpush.sendNotification({ endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } }, payload, { TTL: 3600 }); sent++; }
      catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await rpc("drop_push_endpoint", { p_endpoint: d.endpoint }, "service").catch(() => undefined);
        else console.error("push failed", code);
      }
    }
  }
  return sent;
}

async function makeT(locale: string) {
  const messages = await loadMessages(locale);
  return createTranslator({ locale, messages, namespace: "app.notify" as never }) as unknown as { has: (k: string) => boolean; (k: string, v?: Record<string, unknown>): string };
}
