import "server-only";
import { rpc } from "@/lib/data/rpc";
import { siteUrl } from "@/lib/env";
import { renderMessage, staffLocale, type AlertPayload, type BookingContext, type InvitePayload, type MessageKind } from "./render";
import { sendEmail } from "./send";
import { unseal } from "./seal";

type Claimed = {
  id: string; kind: MessageKind; recipient: "guest" | "operator" | "platform" | "invitee"; locale: string;
  payload: AlertPayload | InvitePayload | Record<string, never>; attempts: number; booking: BookingContext | null;
};

export const manageLink = (locale: string, token: string) => `${siteUrl()}/${locale}/booking/${token}`;

/** Sends what is due. Each message is claimed first, so two runs never send the same email twice. */
export async function deliverDue(limit = 50) {
  const batch = await rpc<Claimed[]>("outbox_claim", { p_limit: limit }, "service");
  const summary = { claimed: batch.length, sent: 0, logged: 0, failed: 0, skipped: 0 };

  for (const m of batch) {
    let status: "sent" | "logged" | "failed" | "skipped" = "failed";
    let error: string | null = null;
    let providerId: string | null = null;
    try {
      const b = m.booking;
      const to =
        m.recipient === "guest" ? b?.customer.email :
        m.recipient === "operator" ? b?.operator_email :
        m.recipient === "invitee" ? (m.payload as InvitePayload).email :
        process.env.PLATFORM_ALERT_EMAIL;
      if (to && /\.(example|test|invalid)$/i.test(to.trim())) {
        status = "skipped"; // reserved test domains (demo guests): never sent
        error = "test address, not sent";
      } else if (!to) {
        status = "skipped";
        error = m.recipient === "platform" ? "PLATFORM_ALERT_EMAIL not set" : "no email address";
      } else {
        const locale = m.recipient === "guest" ? m.locale : staffLocale();
        const token = unseal(b?.sealed_link);
        const rendered = await renderMessage(m.kind, {
          locale,
          booking: b,
          payload: m.kind === "admin_alert" || m.kind === "team_invite" ? (m.payload as AlertPayload | InvitePayload) : null,
          link: token ? manageLink(m.locale, token) : null,
          dashboardUrl: m.recipient === "invitee" ? `${siteUrl()}/${locale}/signin` : m.recipient === "operator" ? `${siteUrl()}/${locale}/app` : m.recipient === "platform" ? `${siteUrl()}/${locale}/app/admin/bookings?r=sent` : undefined,
        });
        const r = await sendEmail(to, rendered, `wenro-${m.id}`);
        status = r.status;
        error = r.error ?? null;
        providerId = r.providerId ?? null;
      }
    } catch (e) {
      status = "failed";
      error = e instanceof Error ? e.message : "render_error";
      console.error("message", m.id, m.kind, e);
    }
    summary[status] += 1;
    await rpc("outbox_result", { p_id: m.id, p_status: status, p_error: error, p_provider_id: providerId }, "service");
  }
  return summary;
}

/** Everything the scheduler does in one call: the database jobs, then sending. */
export async function runTick(now?: Date) {
  const jobs = await rpc<Record<string, unknown>>("run_scheduled_jobs", now ? { p_now: now.toISOString() } : {}, "service");
  const mail = await deliverDue(50);
  return { jobs, mail };
}
