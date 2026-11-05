"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { rpc, RpcError } from "@/lib/data/rpc";
import { dataMode } from "@/lib/env";
import { PASSWORD_HINT_COOKIE } from "@/lib/auth";
import { createUserClient } from "@/lib/supabase/server";

const locales = z.enum(["en", "de", "ru", "fr", "ar"]);
type Account = { email: string | null; username: string | null; password_set: boolean };

/**
 * Username and password for the signed-in person. The password goes straight to Supabase Auth (stored
 * hashed there, never in our tables); we only remember that one was set.
 */
export async function saveAccount(form: FormData) {
  const locale = locales.catch("en").parse(form.get("locale"));
  const first = form.get("first") === "1";
  const back = (err: string) => redirect({ href: `/app/account?${first ? "first=1&" : ""}err=${err}`, locale });
  const me = await rpc<Account | null>("my_account", {}, "user").catch(() => null);
  if (!me) redirect({ href: "/signin", locale });

  const username = String(form.get("username") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");

  if (username && username !== me!.username) {
    try { await rpc("set_username", { p_username: username }, "user"); }
    catch (e) { back(e instanceof RpcError ? e.code : "unexpected_error"); }
  } else if (!username && !me!.username) back("invalid_username");

  if (password || !me!.password_set) {
    if (password.length < 10) back("password_short");
    if (password.length > 72) back("password_long");
    if (password !== confirm) back("password_mismatch");
    if (password.toLowerCase() === (username || me!.username || "") || password.toLowerCase() === (me!.email ?? "").toLowerCase()) back("password_weak");
    if (dataMode() !== "localpg") {
      const supabase = await createUserClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        console.error("updateUser password failed", error.status, error.code);
        back(error.code === "weak_password" ? "password_weak" : error.code === "same_password" ? "password_same" : "unexpected_error");
      }
    }
    await rpc("mark_password_set", {}, "user");
    (await cookies()).set(PASSWORD_HINT_COOKIE, "1", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 400, secure: true });
  }
  redirect({ href: first ? "/app" : "/app/account?ok=account_saved", locale });
}
