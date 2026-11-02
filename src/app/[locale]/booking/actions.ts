"use server";

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
  revalidatePath("/[locale]/booking/[token]", "page");
}
