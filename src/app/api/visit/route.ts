import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { rpc } from "@/lib/data/rpc";
import { allow, clientKey } from "@/lib/ratelimit";

const SLUG = /^[a-z0-9-]{1,120}$/;
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|headless|lighthouse/i;

/**
 * Counts one page view on the public site. No cookies, nothing about the person is kept: a visitor is an
 * anonymous daily hash (salted IP + browser) that the database deletes after two days.
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return new NextResponse(null, { status: 403 });
  const ua = req.headers.get("user-agent") ?? "";
  if (!ua || BOT.test(ua)) return new NextResponse(null, { status: 204 });
  const key = await clientKey();
  if (!(await allow(`visit:${key}`, 300, 3600))) return new NextResponse(null, { status: 204 });
  const body = await req.json().catch(() => null);
  const slug = typeof body?.slug === "string" && SLUG.test(body.slug) ? body.slug : null;
  const day = new Date().toISOString().slice(0, 10);
  const h = createHash("sha256").update(`${process.env.CRON_SECRET ?? "wenro"}:${day}:${key}:${ua}`).digest("base64url").slice(0, 32);
  await rpc("record_visit", { p_hash: h, p_slug: slug }, "service").catch(() => undefined);
  return new NextResponse(null, { status: 204 });
}
