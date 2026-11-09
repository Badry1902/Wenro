import "server-only";
import { createClient } from "@supabase/supabase-js";
import { dataMode, publicEnv, serverEnv } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/admin";
import { createUserClient } from "@/lib/supabase/server";
import { currentUserId } from "@/lib/auth";

/**
 * Every read and write goes through a database function (RPC).
 * The database applies all rules; this file only carries the call.
 *
 * `as`:
 *   - "anon":    a visitor. Row-level security applies.
 *   - "user":    the signed-in person (dashboards). Each function checks their role.
 *   - "service": the server acting for a guest (booking, manage link). Never exposed to the browser.
 */
type As = "anon" | "user" | "service";

const ALLOWED = new Set([
  // public site
  "experience_page", "experience_list", "create_booking", "booking_by_token",
  "cancel_booking_by_token", "reconfirm_by_token", "record_click",
  // workspaces
  "my_workspaces", "claim_platform_owner", "platform_has_owner", "apply_organization",
  "operator_experiences", "operator_slots", "operator_bookings", "create_slots", "set_slot",
  "check_in", "check_in_booking", "mark_no_show", "decide_request", "cancel_slot",
  "admin_overview", "admin_bookings", "admin_organizations", "set_org_status",
  "admin_experiences", "set_experience_status", "finance_overview",
  "generate_operator_statements", "mark_statement_received", "create_partner_payouts", "mark_payout_paid",
  "partner_summary", "partner_bookings", "unconfirmed_for_tomorrow", "set_payout_handle",
  // messaging and scheduled jobs
  "store_link_secret", "sealed_link_for", "outbox_claim", "outbox_result", "run_scheduled_jobs",
  "admin_messages", "admin_message_detail", "retry_message",
  // editor, team, money, coupons, support, demo
  "experience_editor", "editor_options", "save_experience", "add_experience_media", "remove_experience_media",
  "move_experience_media", "invite_member", "cancel_invite", "accept_invites", "org_team", "set_member_active",
  "operator_finance", "hit_rate_limit", "admin_coupons", "save_coupon", "admin_cancel_booking", "demo_status", "demo_join_all", "admin_operator_dues", "admin_partner_dues",
  // reviews and accounts
  "review_for_token", "submit_review_by_token", "experience_reviews", "admin_reviews", "moderate_review", "operator_reviews",
  "my_account", "set_username", "mark_password_set", "email_for_username",
  "set_experience_location", "experience_location", "public_location",
  "plan_slots", "partner_stats", "operator_trip_quality", "operator_today", "save_push_subscription", "delete_push_subscription",
  "pending_pushes", "drop_push_endpoint", "set_translation_flags", "add_machine_translations", "experiences_missing_locales", "my_notifications", "unread_notifications",
  "mark_notifications_read", "record_visit", "admin_visits", "operator_visits",
]);

const TABLE_FUNCTIONS = new Set(["operator_bookings", "partner_bookings", "unconfirmed_for_tomorrow"]);

/** A rule the database refused, e.g. "sold_out", "forbidden". */
export class RpcError extends Error {
  constructor(public code: string, message?: string) {
    super(message ?? code);
  }
}

function toCode(message: string) {
  return /^[a-z_]+$/.test(message) ? message : "unexpected_error";
}

export async function rpc<T>(fn: string, args: Record<string, unknown>, as: As): Promise<T> {
  if (!ALLOWED.has(fn)) throw new Error(`rpc ${fn} is not allowed`);
  return dataMode() === "localpg" ? rpcLocal<T>(fn, args, as) : rpcSupabase<T>(fn, args, as);
}

async function rpcSupabase<T>(fn: string, args: Record<string, unknown>, as: As): Promise<T> {
  let client;
  if (as === "service") {
    serverEnv();
    client = createServiceClient();
  } else if (as === "user") {
    client = await createUserClient();
  } else {
    const env = publicEnv();
    client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  const { data, error } = await client.rpc(fn, args);
  if (error) throw new RpcError(toCode(error.message), error.message);
  return data as T;
}

// ---- Local Postgres (developer machines and automated tests only) ----
let pool: import("pg").Pool | undefined;

async function rpcLocal<T>(fn: string, args: Record<string, unknown>, as: As): Promise<T> {
  const { Pool } = await import("pg");
  pool ??= new Pool({ connectionString: process.env.WENRO_LOCAL_PG_URL, max: 5 });
  const keys = Object.keys(args);
  for (const k of keys) if (!/^[a-z_]+$/.test(k)) throw new Error("bad argument name");
  const argList = keys.map((k, i) => `${k} => $${i + 1}`).join(", ");
  // Functions that return rows come back as one JSON array, like the Supabase API does.
  const call = TABLE_FUNCTIONS.has(fn)
    ? `select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) as r from ${fn}(${argList}) x`
    : `select ${fn}(${argList}) as r`;
  const values = keys.map((k) => {
    const v = args[k];
    if (Array.isArray(v)) return v; // Postgres arrays (int[], time[])
    return v !== null && typeof v === "object" ? JSON.stringify(v) : v;
  });
  let claims: Record<string, string> = { role: as === "service" ? "service_role" : "anon" };
  let role = as === "service" ? "service_role" : "anon";
  if (as === "user") {
    const uid = await currentUserId();
    if (!uid) throw new RpcError("not_signed_in");
    claims = { role: "authenticated", sub: uid };
    role = "authenticated";
  }
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]);
    await client.query(`set local role ${role}`);
    const res = await client.query(call, values);
    await client.query("commit");
    return res.rows[0]?.r as T;
  } catch (e) {
    await client.query("rollback").catch(() => {});
    const message = e instanceof Error ? e.message : String(e);
    throw new RpcError(toCode(message), message);
  } finally {
    client.release();
  }
}
