"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { DEV_USER_COOKIE } from "@/lib/auth";
import { dataMode, siteUrl } from "@/lib/env";
import { createUserClient } from "@/lib/supabase/server";

const locales = z.enum(["en", "de", "ru", "fr", "ar"]);

export async function sendSignInLink(form: FormData) {
  const locale = locales.catch("en").parse(form.get("locale"));
  const email = z.string().trim().email().safeParse(form.get("email"));
  if (!email.success) redirect({ href: "/signin?error=email", locale });
  const supabase = await createUserClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data!,
    options: { emailRedirectTo: `${siteUrl()}/api/auth/callback?next=/${locale}/app`, shouldCreateUser: true },
  });
  if (error) {
    console.error("signInWithOtp failed", error.message);
    redirect({ href: "/signin?error=send", locale });
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
