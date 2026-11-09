"use server";

import { z } from "zod";
import { rpc } from "@/lib/data/rpc";

const sub = z.object({ endpoint: z.string().url().max(1000), keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }) });

/** Saves this device for push alerts (signed-in person only; the database checks who is asking). */
export async function savePushSubscription(json: string, locale: string) {
  const s = sub.safeParse(JSON.parse(json));
  if (!s.success) return false;
  await rpc("save_push_subscription", { p_endpoint: s.data.endpoint, p_p256dh: s.data.keys.p256dh, p_auth: s.data.keys.auth, p_locale: locale }, "user");
  return true;
}

export async function deletePushSubscription(endpoint: string) {
  await rpc("delete_push_subscription", { p_endpoint: String(endpoint).slice(0, 1000) }, "user").catch(() => undefined);
  return true;
}
