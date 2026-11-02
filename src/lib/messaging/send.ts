import "server-only";
import type { Rendered } from "./render";

export type SendResult = { status: "sent" | "logged" | "failed"; providerId?: string; error?: string };

/**
 * Email provider. With RESEND_API_KEY and MAIL_FROM set, mail goes out through Resend
 * (https://resend.com; any provider with an HTTP API can replace this function).
 * Without them, nothing leaves the server: the message is printed to the server log and marked "logged",
 * so the whole flow can be tested before the domain and the provider are ready.
 */
export async function sendEmail(to: string, m: Rendered, idempotencyKey: string): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM; // e.g. "WENRO <bookings@your-domain>" — the domain must be verified at the provider
  if (!key || !from) {
    console.info(`[mail:logged] to=${to.replace(/(.{2}).*(@.*)/, "$1…$2")} subject="${m.subject}"`);
    return { status: "logged" };
  }
  try {
    const res = await fetch(process.env.RESEND_API_URL ?? "https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({
        from, to: [to], subject: m.subject, html: m.html, text: m.text,
        ...(process.env.MAIL_REPLY_TO ? { reply_to: process.env.MAIL_REPLY_TO } : {}),
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
    if (!res.ok) return { status: "failed", error: `${res.status} ${body.name ?? ""} ${body.message ?? ""}`.trim() };
    return { status: "sent", providerId: body.id };
  } catch (e) {
    return { status: "failed", error: e instanceof Error ? e.message : "send_error" };
  }
}
