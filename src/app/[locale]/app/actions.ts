"use server";

import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { rpc, RpcError } from "@/lib/data/rpc";

/**
 * Dashboard actions. Each one calls a database function AS THE SIGNED-IN USER;
 * the database checks the role, so a forged form cannot do more than the person may.
 * After the call we go back to the page with ?ok=<action> or ?err=<code> for the banner.
 */
const locale = z.enum(["en", "de", "ru", "fr", "ar"]).catch("en");
const back = z.string().regex(/^\/app(\/[A-Za-z0-9_-]+)*$/).catch("/app");
const id = z.guid();

async function run(form: FormData, name: string, fn: string, args: Record<string, unknown>) {
  const l = locale.parse(form.get("locale"));
  const b = back.parse(form.get("back"));
  const keep = String(form.get("keep") ?? "").replace(/[^A-Za-z0-9=&_-]/g, "");
  let result = `ok=${name}`;
  try {
    await rpc(fn, args, "user");
  } catch (e) {
    result = `err=${e instanceof RpcError ? e.code : "unexpected_error"}`;
    if (!(e instanceof RpcError)) console.error(fn, e);
  }
  redirect({ href: `${b}?${result}${keep ? `&${keep}` : ""}`, locale: l });
}

const v = (form: FormData, key: string) => String(form.get(key) ?? "");

// ---- joining ----
export async function claimOwner(form: FormData) {
  await run(form, "claimed", "claim_platform_owner", {});
}
export async function applyOrganization(form: FormData) {
  const type = z.enum(["operator", "marketer", "agency"]).parse(v(form, "type"));
  await run(form, "applied", "apply_organization", {
    p_type: type, p_name: v(form, "name").slice(0, 120), p_phone: v(form, "phone").slice(0, 30), p_email: v(form, "email").slice(0, 200),
  });
}

// ---- operator ----
export async function checkIn(form: FormData) {
  await run(form, "checked_in", "check_in_booking", { p_booking: id.parse(v(form, "booking")) });
}
export async function checkInByCode(form: FormData) {
  const code = v(form, "code").trim().toLowerCase();
  await run(form, "checked_in", "check_in", { p_qr: /^[a-f0-9]{32}$/.test(code) ? code : "invalid" });
}
export async function noShow(form: FormData) {
  await run(form, "no_show", "mark_no_show", { p_booking: id.parse(v(form, "booking")) });
}
export async function decideRequest(form: FormData) {
  const accept = v(form, "accept") === "1";
  await run(form, accept ? "accepted" : "declined", "decide_request", { p_booking: id.parse(v(form, "booking")), p_accept: accept });
}
export async function createSlots(form: FormData) {
  const days = form.getAll("weekday").map((d) => z.coerce.number().int().min(1).max(7).parse(d));
  const times = v(form, "times").split(/[,\s]+/).filter(Boolean).map((tm) => z.string().regex(/^\d{2}:\d{2}$/).parse(tm));
  await run(form, "slots_created", "create_slots", {
    p_experience: id.parse(v(form, "experience")),
    p_from: z.string().date().parse(v(form, "from")),
    p_to: z.string().date().parse(v(form, "to")),
    p_weekdays: days,
    p_times: times,
    p_capacity: z.coerce.number().int().min(1).max(500).parse(v(form, "capacity")),
  });
}
export async function setSlot(form: FormData) {
  await run(form, "slot_saved", "set_slot", {
    p_slot: id.parse(v(form, "slot")),
    p_capacity: z.coerce.number().int().min(0).max(500).parse(v(form, "capacity")),
    p_open: v(form, "open") === "1",
  });
}
export async function cancelSlot(form: FormData) {
  await run(form, "slot_cancelled", "cancel_slot", { p_slot: id.parse(v(form, "slot")), p_reason: "weather" });
}
export async function setExperienceStatus(form: FormData) {
  const status = z.enum(["draft", "in_review", "published", "archived"]).parse(v(form, "status"));
  await run(form, `experience_${status}`, "set_experience_status", { p_experience: id.parse(v(form, "experience")), p_status: status });
}

// ---- platform ----
export async function setOrgStatus(form: FormData) {
  const status = z.enum(["active", "suspended", "pending"]).parse(v(form, "status"));
  await run(form, `org_${status}`, "set_org_status", { p_org: id.parse(v(form, "org")), p_status: status });
}
export async function generateStatements(form: FormData) {
  await run(form, "statements_generated", "generate_operator_statements", {
    p_start: z.string().date().parse(v(form, "from")), p_end: z.string().date().parse(v(form, "to")),
  });
}
export async function markStatementReceived(form: FormData) {
  await run(form, "statement_received", "mark_statement_received", { p_statement: id.parse(v(form, "statement")) });
}
export async function createPayouts(form: FormData) {
  await run(form, "payouts_created", "create_partner_payouts", { p_month: z.string().date().parse(v(form, "month")) });
}
export async function markPayoutPaid(form: FormData) {
  await run(form, "payout_paid", "mark_payout_paid", {
    p_payout: id.parse(v(form, "payout")), p_reference: v(form, "reference").trim().slice(0, 80) || null,
  });
}

// ---- partners ----
export async function setPayoutHandle(form: FormData) {
  await run(form, "handle_saved", "set_payout_handle", { p_org: id.parse(v(form, "org")), p_handle: v(form, "handle").slice(0, 80) });
}

// ---- messages (WENRO team) ----
export async function runJobsNow(form: FormData) {
  const l = locale.parse(form.get("locale"));
  // The jobs run with the server's service role, so check here that the caller is on the WENRO team.
  const { getWorkspaces } = await import("@/lib/workspaces");
  const ws = await getWorkspaces(l);
  if (!ws.some((w) => w.type === "platform" && ["owner", "ops"].includes(w.role))) {
    redirect({ href: "/app/admin/messages?err=forbidden", locale: l });
  }
  let result = "ok=jobs_ran";
  try {
    const { runTick } = await import("@/lib/messaging/deliver");
    const r = await runTick();
    result += `&n=${r.mail.claimed}`;
  } catch (e) {
    console.error("runJobsNow", e);
    result = "err=unexpected_error";
  }
  redirect({ href: `/app/admin/messages?${result}`, locale: l });
}
export async function retryMessage(form: FormData) {
  await run(form, "message_queued", "retry_message", { p_id: id.parse(v(form, "message")) });
}
