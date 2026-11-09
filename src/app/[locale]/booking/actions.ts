"use server";

import { after } from "next/server";
import { dispatchPushes } from "@/lib/push";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { rpc, RpcError } from "@/lib/data/rpc";

const token = z.string().regex(/^[a-f0-9]{64}$/);

export async function cancelBooking(form: FormData) {
  const t = token.safeParse(form.get("token"));
  if (!t.success) return;
  try {
    await rpc("cancel_booking_by_token", { p_token: t.data }, "service");
  } catch (e) {
    if (!(e instanceof RpcError)) throw e; // already cancelled / started: the page shows the current state
  }
  after(() => dispatchPushes().catch(() => undefined));
  revalidatePath("/[locale]/booking/[token]", "page");
}

export async function reconfirmBooking(form: FormData) {
  const t = token.safeParse(form.get("token"));
  if (!t.success) return;
  try {
    await rpc("reconfirm_by_token", { p_token: t.data }, "service");
  } catch (e) {
    if (!(e instanceof RpcError)) throw e;
  }
  after(() => dispatchPushes().catch(() => undefined));
  revalidatePath("/[locale]/booking/[token]", "page");
}

/** Guest review through their own booking link. Saved for the WENRO team to publish. */
export async function submitReview(form: FormData) {
  const t = token.safeParse(form.get("token"));
  const rating = z.coerce.number().int().min(1).max(5).safeParse(form.get("rating"));
  const body = z.string().max(1500).catch("").parse(form.get("body") ?? "");
  if (!t.success) return;
  if (!rating.success) return { error: "invalid_rating" as const };
  try {
    await rpc("submit_review_by_token", { p_token: t.data, p_rating: rating.data, p_body: body }, "service");
  } catch (e) {
    if (!(e instanceof RpcError)) throw e;
    return { error: e.code };
  }
  after(() => dispatchPushes().catch(() => undefined));
  revalidatePath("/[locale]/booking/[token]", "page");
  return { ok: true as const };
}
