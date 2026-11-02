import { NextResponse, type NextRequest } from "next/server";
import { rpc } from "@/lib/data/rpc";
import { allow, clientKey } from "@/lib/ratelimit";

const REF = /^[A-Za-z0-9]{4,20}$/;
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Counts one visit through a partner link (no personal data). The trip page itself stays cached. */
export async function POST(req: NextRequest) {
  // Only from our own pages, and at most 60 counted visits per visitor per hour
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return new NextResponse(null, { status: 403 });
  if (!(await allow(`click:${await clientKey()}`, 60, 3600))) return new NextResponse(null, { status: 204 });
  const body = await req.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code : "";
  const exp = typeof body?.experience === "string" ? body.experience : "";
  if (REF.test(code) && GUID.test(exp)) {
    await rpc("record_click", { p_code: code, p_experience: exp }, "service").catch(() => undefined);
  }
  return new NextResponse(null, { status: 204 });
}
