import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { currentUserId } from "@/lib/auth";
import { IDLE_LIMIT_S, SEEN_COOKIE, nowS } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Tells the public pages whether the visitor is signed in (to show "Dashboard" instead of "Sign in"). No personal data. */
export async function GET() {
  // Same idle rule as the middleware (API routes do not pass through it)
  const seen = Number((await cookies()).get(SEEN_COOKIE)?.value) || 0;
  const fresh = seen > 0 && nowS() - seen <= IDLE_LIMIT_S;
  const signedIn = fresh && !!(await currentUserId().catch(() => null));
  return NextResponse.json({ signedIn }, { headers: { "cache-control": "private, no-store" } });
}
