import { z } from "zod";

/**
 * Two ways to reach the database:
 *  - "supabase" (normal): through the Supabase API with the keys below.
 *  - "localpg"  (developer machines / automated tests only): straight to a local Postgres
 *    via WENRO_LOCAL_PG_URL. Never set WENRO_LOCAL_PG_URL in production.
 */
export function dataMode(): "supabase" | "localpg" {
  return process.env.WENRO_LOCAL_PG_URL ? "localpg" : "supabase";
}

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

/** Public values (safe in the browser). */
export function publicEnv() {
  return publicSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}

// Secrets: server only. Set them in .env.local (development) or the hosting
// provider's environment settings — never commit them, never paste them in chat.
const serverSchema = publicSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

export function serverEnv() {
  if (typeof window !== "undefined") throw new Error("serverEnv() called in the browser");
  return serverSchema.parse(process.env);
}

export function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}
