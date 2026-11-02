import { NextResponse, type NextRequest } from "next/server";
import { createUserClient } from "@/lib/supabase/server";

// The sign-in email links here. We swap the one-time code for a session, then continue.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const next = req.nextUrl.searchParams.get("next") ?? "/en/app";
  const safeNext = /^\/(en|de|ru|fr|ar)\/app(\/|$)/.test(next) ? next : "/en/app";
  if (code) {
    const supabase = await createUserClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNext, req.url));
  }
  return NextResponse.redirect(new URL(`${safeNext.slice(0, 3)}/signin?error=link`, req.url));
}
