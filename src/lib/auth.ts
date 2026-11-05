import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { dataMode } from "@/lib/env";
import { createUserClient } from "@/lib/supabase/server";

/** Local developer mode only: pretend to be one of the demo users (no passwords, no email). */
export const DEV_USER_COOKIE = "wenro_dev_uid";
/** Remembers on this browser that the person signs in with a password, so that form opens first. */
export const PASSWORD_HINT_COOKIE = "wenro_pw";

/**
 * The signed-in person's id, checked once per request. getClaims() verifies the session token's
 * signature locally (Supabase signing keys), so a dashboard page does not wait for the Auth server.
 */
export const currentUserId = cache(async (): Promise<string | null> => {
  if (dataMode() === "localpg") {
    const v = (await cookies()).get(DEV_USER_COOKIE)?.value ?? null;
    return v && /^[0-9a-f-]{36}$/.test(v) ? v : null;
  }
  const supabase = await createUserClient();
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  return typeof sub === "string" ? sub : null;
});

export async function currentUserEmail(): Promise<string | null> {
  if (dataMode() === "localpg") return null;
  const supabase = await createUserClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.email ?? null;
}
