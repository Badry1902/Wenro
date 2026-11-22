import { NextResponse, type NextRequest } from "next/server";
import { rpc } from "@/lib/data/rpc";
import { allow, clientKey } from "@/lib/ratelimit";

const ID = /^[0-9a-f-]{36}$/;
const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse/i;

/** Counts one pop-up view, click or close. Anonymous (no cookies, no person); limited per visitor. */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return new NextResponse(null, { status: 403 });
  const ua = req.headers.get("user-agent") ?? "";
  if (!ua || BOT.test(ua)) return new NextResponse(null, { status: 204 });
  const body = await req.json().catch(() => null) as { id?: unknown; kind?: unknown } | null;
  const id = typeof body?.id === "string" && ID.test(body.id) ? body.id : null;
  const kind = body?.kind === "view" || body?.kind === "click" || body?.kind === "close" ? body.kind : null;
  if (!id || !kind) return new NextResponse(null, { status: 400 });
  if (!(await allow(`popup:${await clientKey()}`, 30, 3600))) return new NextResponse(null, { status: 204 });
  await rpc("popup_event", { p_popup: id, p_kind: kind }, "service").catch(() => undefined);
  return new NextResponse(null, { status: 204 });
}
