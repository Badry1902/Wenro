import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { rpc } from "@/lib/data/rpc";

/** The visitor's IP as a salted hash (never stored in clear). */
export async function clientKey() {
  const h = await headers();
  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  return createHash("sha256").update(`${process.env.CRON_SECRET ?? "wenro"}:${ip}`).digest("base64url").slice(0, 22);
}

/**
 * Shared limiter (database, so it holds across all server instances). Returns true while under the limit.
 * Fails open: if the check itself breaks, the request goes through rather than blocking real guests.
 */
export async function allow(bucket: string, max: number, windowSeconds: number) {
  try {
    return await rpc<boolean>("hit_rate_limit", { p_bucket: bucket, p_max: max, p_window_seconds: windowSeconds }, "service");
  } catch (e) {
    console.error("rate limit check failed", e);
    return true;
  }
}
