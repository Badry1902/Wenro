import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Tells the public pages whether the visitor is signed in (to show "Dashboard" instead of "Sign in"). No personal data. */
export async function GET() {
  const signedIn = !!(await currentUserId().catch(() => null));
  return NextResponse.json({ signedIn }, { headers: { "cache-control": "private, no-store" } });
}
