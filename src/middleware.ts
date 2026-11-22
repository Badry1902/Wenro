import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { routing } from "./i18n/routing";
import { IDLE_LIMIT_S, SEEN_COOKIE, SEEN_REFRESH_S, isAuthCookie, nowS, seenCookie, sessionOnly } from "./lib/session";

const intl = createMiddleware(routing);

// Marketer/agency links look like ...?ref=CODE. The code is kept for 30 days (attribution window)
// and sent with the booking; the database decides whether it earns a commission.
const REF = /^[A-Za-z0-9]{4,20}$/;

export default async function middleware(req: NextRequest) {
  // A sign-in link that landed on a page instead of /api/auth/callback (Supabase falls back to the
  // "Site URL" when the return address is not on its list): finish the sign-in here.
  const code = req.nextUrl.searchParams.get("code");
  if (code && /^[0-9a-f-]{20,64}$/i.test(code)) {
    const loc = req.nextUrl.pathname.split("/")[1];
    const locale = (routing.locales as readonly string[]).includes(loc) ? loc : routing.defaultLocale;
    const to = new URL("/api/auth/callback", req.url);
    to.searchParams.set("code", code);
    to.searchParams.set("next", `/${locale}/app`);
    return NextResponse.redirect(to);
  }

  // Idle sign-out: a session unused for 12 hours, or whose browser was closed, starts again as a guest.
  const secure = req.nextUrl.protocol === "https:";
  const authCookies = req.cookies.getAll().filter((c) => isAuthCookie(c.name));
  const seen = Number(req.cookies.get(SEEN_COOKIE)?.value) || 0;
  if (authCookies.length && (!seen || nowS() - seen > IDLE_LIMIT_S)) {
    // Send the same address again without the sign-in cookies, so this request is already a guest's
    const out = NextResponse.redirect(req.nextUrl, req.method === "GET" || req.method === "HEAD" ? 307 : 303);
    for (const c of authCookies) out.cookies.set(c.name, "", { path: "/", maxAge: 0 });
    out.cookies.set(SEEN_COOKIE, "", { path: "/", maxAge: 0 });
    out.headers.set("Cache-Control", "private, no-store");
    return out;
  }

  const res = intl(req);
  if (authCookies.length && nowS() - seen > SEEN_REFRESH_S) {
    const c = seenCookie(secure);
    res.cookies.set(c.name, c.value, c.options);
  }

  const ref = req.nextUrl.searchParams.get("ref");
  if (ref && REF.test(ref)) {
    res.cookies.set("wenro_ref", ref.toUpperCase(), {
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: true,
      sameSite: "lax",
      secure: req.nextUrl.protocol === "https:",
      path: "/",
    });
  }

  // Keep the Supabase sign-in session fresh for dashboard pages.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key && !process.env.WENRO_LOCAL_PG_URL && req.nextUrl.pathname.includes("/app")) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (toSet) => toSet.forEach(({ name, value, options }) => res.cookies.set(name, value, sessionOnly(value, options))),
      },
    });
    await supabase.auth.getClaims();
  }
  return res;
}

export const config = {
  // Everything except API routes, Next internals and static files
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
