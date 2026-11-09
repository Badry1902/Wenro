import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runTick } from "@/lib/messaging/deliver";
import { dispatchPushes } from "@/lib/push";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * The scheduler calls this every 10 minutes (vercel.json, or any cron service) with
 *   Authorization: Bearer <CRON_SECRET>
 * It runs the due jobs (request expiry, 18:00 reconfirm, 21:00 alert, 22:00 auto-cancel) and sends queued emails.
 * Safe to call more often or twice at once: every step is idempotent.
 */
function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32) return false; // refuse to run unprotected
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

async function handle(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const r = await runTick();
    const pushed = await dispatchPushes().catch(() => 0);
    return NextResponse.json({ ...r, pushed });
  } catch (e) {
    console.error("cron tick failed", e);
    return NextResponse.json({ error: "tick_failed" }, { status: 500 });
  }
}

export const GET = handle; // Vercel Cron uses GET
export const POST = handle;
