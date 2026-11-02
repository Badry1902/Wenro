"use server";

import { cookies, headers } from "next/headers";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { rpc, RpcError } from "@/lib/data/rpc";
import { seal } from "@/lib/messaging/seal";
import { allow, clientKey } from "@/lib/ratelimit";

export type PlaceBookingState = { error?: string } | undefined;

const schema = z.object({
  locale: z.enum(["en", "de", "ru", "fr", "ar"]),
  experience_id: z.guid(),
  slot_id: z.guid(),
  adults: z.coerce.number().int().min(1).max(20),
  children: z.coerce.number().int().min(0).max(20),
  infants: z.coerce.number().int().min(0).max(20),
  hotel_id: z.guid().optional().or(z.literal("")),
  transport: z.enum(["0", "1"]),
  extras: z.string().optional(),
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  country_code: z.string().regex(/^\+\d{1,4}$/),
  phone: z.string().trim().regex(/^[\d\s()-]{6,20}$/),
  room: z.string().trim().max(20).optional(),
  coupon: z.string().trim().max(20).optional(),
  display_currency: z.string().max(3).optional(),
  agency_id: z.guid().optional(),
  accept: z.literal("on"),
  website: z.string().max(0).optional(), // honeypot: real people leave it empty
});

// Very small in-memory limiter: at most 10 booking attempts per IP per 10 minutes per server instance.
// Replace with a shared limiter (and a CAPTCHA if abuse appears) before launch.
const attempts = new Map<string, number[]>();
function tooMany(ip: string) {
  const now = Date.now();
  const recent = (attempts.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  recent.push(now);
  attempts.set(ip, recent);
  return recent.length > 10;
}

export async function placeBooking(_: PlaceBookingState, form: FormData): Promise<PlaceBookingState> {
  if (form.get("accept") !== "on") return { error: "accept_required" };
  const parsed = schema.safeParse(Object.fromEntries(form.entries()));
  if (!parsed.success) return { error: "customer_details_required" };
  const d = parsed.data;

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (tooMany(ip)) return { error: "too_many_attempts" };
  // Shared across all server instances: 12 booking attempts per visitor per 10 minutes, 40 per day
  const who = await clientKey();
  if (!(await allow(`book:${who}`, 12, 600)) || !(await allow(`bookday:${who}`, 40, 86400))) return { error: "too_many_attempts" };

  const ref = (await cookies()).get("wenro_ref")?.value;
  let token: string;
  try {
    const res = await rpc<{ manage_token: string; booking_id: string }>(
      "create_booking",
      {
        p: {
          experience_id: d.experience_id,
          slot_id: d.slot_id,
          quantities: { adult: d.adults, child: d.children, infant: d.infants },
          hotel_id: d.hotel_id || null,
          transport: d.transport === "1",
          extras: (d.extras ?? "").split(",").filter(Boolean).map((id) => ({ id })),
          coupon_code: d.coupon || null,
          partner_code: d.agency_id ? null : ref || null,
          agency_id: d.agency_id ?? null,
          customer: {
            full_name: d.full_name,
            email: d.email,
            phone: `${d.country_code} ${d.phone.replace(/\s+/g, " ")}`,
            room: d.room || null,
          },
          locale: d.locale,
          display_currency: d.display_currency || null,
        },
      },
      // Agency counter bookings run as the signed-in person so the database can check membership.
      d.agency_id ? "user" : "service",
    );
    token = res.manage_token;
    await keepLinkForMessages(res.booking_id, token);
  } catch (e) {
    if (e instanceof RpcError) return { error: e.code };
    console.error("create_booking failed", e);
    return { error: "unexpected_error" };
  }
  // The confirmation email is queued by the database and sent by the scheduled job (/api/cron/tick).
  redirect({ href: `/booking/${token}?new=1`, locale: d.locale });
}

/**
 * Store the guest's manage link in sealed form so later emails (reconfirm, cancellations) can include it.
 * Never fails the booking: without it, emails simply show the booking reference instead of a link.
 */
async function keepLinkForMessages(bookingId: string, token: string) {
  try {
    const sealed = seal(token);
    if (!sealed) {
      console.warn("MESSAGE_LINK_KEY is not set: emails for this booking will not contain the manage link");
      return;
    }
    await rpc("store_link_secret", { p_booking: bookingId, p_sealed: sealed }, "service");
  } catch (e) {
    console.error("store_link_secret failed", e);
  }
}
