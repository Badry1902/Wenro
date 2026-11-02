import "server-only";
import { cookies } from "next/headers";
import { dataMode } from "@/lib/env";
import { createUserClient } from "@/lib/supabase/server";

/** Local developer mode only: pretend to be one of the demo users (no passwords, no email). */
export const DEV_USER_COOKIE = "wenro_dev_uid";

export async function currentUserId(): Promise<string | null> {
  if (dataMode() === "localpg") {
    const v = (await cookies()).get(DEV_USER_COOKIE)?.value ?? null;
    return v && /^[0-9a-f-]{36}$/.test(v) ? v : null;
  }
  const supabase = await createUserClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function currentUserEmail(): Promise<string | null> {
  if (dataMode() === "localpg") return null;
  const supabase = await createUserClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.email ?? null;
}
