"use server";

import { cookies, headers } from "next/headers";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { DEV_USER_COOKIE } from "@/lib/auth";
import { dataMode, siteUrl } from "@/lib/env";
import { createUserClient } from "@/lib/supabase/server";
import { allow, clientKey } from "@/lib/ratelimit";

const locales = z.enum(["en", "de", "ru", "fr", "ar"]);

/**
 * The link in the email must come back to the same address the person signed in from: the browser keeps
 * a one-time secret for that site, and the callback needs it. Falls back to NEXT_PUBLIC_SITE_URL.
 * (Supabase only accepts return addresses listed under Authentication → URL Configuration → Redirect URLs.)
 */
async function returnOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (host && /^[a-z0-9.-]+(:\d+)?$/i.test(host)) return `${proto}://${host}`;
  return siteUrl();
}

export async function sendSignInLink(form: FormData) {
  const locale = locales.catch("en").parse(form.get("locale"));
  const email = z.string().trim().email().safeParse(form.get("email"));
  if (!email.success) redirect({ href: "/signin?error=email", locale });
  // Protect the sign-in email quota: 5 links per visitor and 3 per address per hour
  const who = await clientKey();
  if (!(await allow(`signin:${who}`, 5, 3600)) || !(await allow(`signin-mail:${email.data!.toLowerCase()}`, 3, 3600))) {
    redirect({ href: "/signin?error=rate", locale });
  }
  const supabase = await createUserClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data!,
    options: { emailRedirectTo: `${await returnOrigin()}/api/auth/callback?next=/${locale}/app`, shouldCreateUser: true },
  });
  if (error) {
    console.error("signInWithOtp failed", error.status, error.message);
    redirect({ href: `/signin?error=${error.status === 429 ? "rate" : "send"}`, locale });
  }
  redirect({ href: `/signin?sent=${encodeURIComponent(email.data!)}`, locale });
}

/** Local developer mode only. Refuses to run against Supabase. */
export async function devSignIn(form: FormData) {
  if (dataMode() !== "localpg") throw new Error("dev sign-in is disabled");
  const locale = locales.catch("en").parse(form.get("locale"));
  const uid = z.string().regex(/^[0-9a-f-]{36}$/).parse(form.get("uid"));
  (await cookies()).set(DEV_USER_COOKIE, uid, { httpOnly: true, sameSite: "lax", path: "/" });
  redirect({ href: "/app", locale });
}

export async function signOut(form: FormData) {
  const locale = locales.catch("en").parse(form.get("locale"));
  if (dataMode() === "localpg") {
    (await cookies()).delete(DEV_USER_COOKIE);
  } else {
    const supabase = await createUserClient();
    await supabase.auth.signOut();
  }
  redirect({ href: "/signin", locale });
}
