"use server";

import { cookies, headers } from "next/headers";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { DEV_USER_COOKIE, PASSWORD_HINT_COOKIE } from "@/lib/auth";
import { dataMode, siteUrl } from "@/lib/env";
import { createUserClient } from "@/lib/supabase/server";
import { allow, clientKey } from "@/lib/ratelimit";
import { rpc } from "@/lib/data/rpc";

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

const email = z.string().trim().toLowerCase().email().max(200);

/**
 * Step 1 of the email sign-in: send a 6-digit code (and a link). The code can be typed on any device,
 * so it works even when the email is read on a phone and the site is open on a computer.
 */
export async function sendSignInCode(form: FormData) {
  const locale = locales.catch("en").parse(form.get("locale"));
  const e = email.safeParse(form.get("email"));
  if (!e.success) redirect({ href: "/signin?m=code&error=email", locale });
  const address = e.data!;
  // Protect the sign-in email quota: 5 sends per visitor and 3 per address per hour
  const who = await clientKey();
  if (!(await allow(`signin:${who}`, 5, 3600)) || !(await allow(`signin-mail:${address}`, 3, 3600))) {
    redirect({ href: `/signin?m=code&sent=${encodeURIComponent(address)}&error=rate`, locale });
  }
  const supabase = await createUserClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: address,
    options: { emailRedirectTo: `${await returnOrigin()}/api/auth/callback?next=/${locale}/app`, shouldCreateUser: true },
  });
  if (error) {
    console.error("signInWithOtp failed", error.status, error.message);
    redirect({ href: `/signin?m=code&error=${error.status === 429 ? "rate" : "send"}`, locale });
  }
  redirect({ href: `/signin?m=code&sent=${encodeURIComponent(address)}`, locale });
}

/** Step 2: the code from the email. */
export async function verifySignInCode(form: FormData) {
  const locale = locales.catch("en").parse(form.get("locale"));
  const e = email.safeParse(form.get("email"));
  const code = String(form.get("code") ?? "").replace(/\D/g, "");
  if (!e.success) redirect({ href: "/signin?m=code&error=email", locale });
  const back = `/signin?m=code&sent=${encodeURIComponent(e.data!)}`;
  if (!/^\d{6,10}$/.test(code)) redirect({ href: `${back}&error=code`, locale });
  const who = await clientKey();
  if (!(await allow(`code:${who}`, 10, 900)) || !(await allow(`code-mail:${e.data}`, 6, 900))) {
    redirect({ href: `${back}&error=rate`, locale });
  }
  const supabase = await createUserClient();
  const { error } = await supabase.auth.verifyOtp({ email: e.data!, token: code, type: "email" });
  if (error) {
    console.error("verifyOtp failed", error.status, error.code);
    redirect({ href: `${back}&error=code`, locale });
  }
  redirect({ href: "/app", locale });
}

/** Username (or email) and password. Same answer for every kind of mistake, so nobody can probe accounts. */
export async function signInWithPassword(form: FormData) {
  const locale = locales.catch("en").parse(form.get("locale"));
  const id = String(form.get("identifier") ?? "").trim().toLowerCase().slice(0, 200);
  const password = String(form.get("password") ?? "");
  const fail = (code: string) => redirect({ href: `/signin?m=password&error=${code}`, locale });
  if (!id || !password || password.length > 200) fail("creds");
  const who = await clientKey();
  if (!(await allow(`pw:${who}`, 10, 900)) || !(await allow(`pw-id:${id}`, 8, 900))) fail("rate");
  const address = id.includes("@") ? id : await rpc<string | null>("email_for_username", { p_username: id }, "service").catch(() => null);
  if (!address) fail("creds");
  const supabase = await createUserClient();
  const { error } = await supabase.auth.signInWithPassword({ email: address!, password });
  if (error) {
    if (error.status !== 400) console.error("signInWithPassword failed", error.status, error.code);
    fail("creds");
  }
  (await cookies()).set(PASSWORD_HINT_COOKIE, "1", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 400, secure: true });
  redirect({ href: "/app", locale });
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
