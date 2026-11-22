import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";
import { isAuthCookie, seenCookie, sessionOnly } from "@/lib/session";

/** Supabase client acting as the signed-in user. RLS applies. */
export async function createUserClient() {
  const env = publicEnv();
  const cookieStore = await cookies();
  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          // Sign-in cookies last until the browser closes (see lib/session.ts); a new session starts the idle clock
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, sessionOnly(value, options)));
          if (toSet.some(({ name, value }) => isAuthCookie(name) && value)) {
            const s = seenCookie(process.env.NODE_ENV === "production");
            cookieStore.set(s.name, s.value, s.options);
          }
        } catch {
          // Called from a Server Component: cookies are refreshed by middleware/route handlers instead.
        }
      },
    },
  });
}
