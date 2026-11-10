"use server";

import { after } from "next/server";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { rpc, RpcError } from "@/lib/data/rpc";
import { dispatchPushes } from "@/lib/push";
import { MAX_PROOF_BYTES, sniffProof, storeProof } from "@/lib/storage";
import { allow, clientKey } from "@/lib/ratelimit";

/**
 * Operator → WENRO payments, and WENRO's payment methods. Every call runs as the signed-in person;
 * the database decides who may do what (operators: owner/manager; review and methods: WENRO owner/finance).
 */
const locale = z.enum(["en", "de", "ru", "fr", "ar"]).catch("en");
const id = z.guid();

/** Operator: report a payment for one or more open statements, with the receipt. */
export async function submitOperatorPayment(form: FormData) {
  const l = locale.parse(form.get("locale"));
  const org = id.parse(form.get("org"));
  const back = `/app/o/${org}/money`;
  let result = "ok=payment_submitted";
  try {
    if (!(await allow(`pay:${await clientKey()}`, 10, 3600))) throw new RpcError("too_many_attempts");
    const statements = z.array(id).min(1).max(24).parse(form.getAll("statement").map(String));
    const method = id.parse(form.get("method"));
    const file = form.get("proof");
    if (!(file instanceof File) || file.size === 0) throw new RpcError("proof_required");
    if (file.size > MAX_PROOF_BYTES) throw new RpcError("file_too_large");
    const buf = Buffer.from(await file.arrayBuffer());
    const kind = sniffProof(buf);
    if (!kind) throw new RpcError("unsupported_file");
    const name = await storeProof(org, buf, kind);
    await rpc("submit_operator_payment", {
      p_operator: org, p_statements: statements, p_method: method,
      p_reference: String(form.get("reference") ?? "").trim().slice(0, 80) || null,
      p_proof: name, p_note: String(form.get("note") ?? "").trim().slice(0, 500) || null,
    }, "user");
    after(() => dispatchPushes().catch(() => undefined));
  } catch (e) {
    result = `err=${e instanceof RpcError ? e.code : e instanceof z.ZodError ? "invalid_input" : "unexpected_error"}`;
    if (!(e instanceof RpcError) && !(e instanceof z.ZodError)) console.error("submitOperatorPayment", e);
  }
  redirect({ href: `${back}?${result}#pay`, locale: l });
}

/** WENRO owner/finance: approve (marks the statements received) or reject with a reason. */
export async function reviewPayment(form: FormData) {
  const l = locale.parse(form.get("locale"));
  const approve = form.get("decision") === "approve";
  let result = approve ? "ok=payment_approved" : "ok=payment_rejected";
  try {
    await rpc("review_operator_payment", { p_payment: id.parse(form.get("payment")), p_approve: approve, p_note: String(form.get("note") ?? "").trim().slice(0, 500) || null }, "user");
    after(() => dispatchPushes().catch(() => undefined));
  } catch (e) {
    result = `err=${e instanceof RpcError ? e.code : "unexpected_error"}`;
    if (!(e instanceof RpcError)) console.error("reviewPayment", e);
  }
  redirect({ href: `/app/admin/finance?tab=review&${result}`, locale: l });
}

/** WENRO owner/finance: add or edit a payment method shown to operators. */
export async function savePaymentMethod(form: FormData) {
  const l = locale.parse(form.get("locale"));
  let result = "ok=method_saved";
  try {
    const p = z.object({
      id: z.union([z.guid(), z.literal("")]),
      kind: z.enum(["instapay", "bank", "wallet", "link"]),
      label: z.string().trim().min(2).max(60),
      account_name: z.string().trim().max(120),
      value: z.string().trim().min(2).max(200),
      extra: z.string().trim().max(300),
      pay_url: z.union([z.string().trim().regex(/^https:\/\/\S+$/).max(500), z.literal("")]),
      sort: z.coerce.number().int().min(0).max(99),
      active: z.enum(["true", "false"]),
    }).parse({
      id: form.get("id") ?? "", kind: form.get("kind"), label: form.get("label"), account_name: form.get("account_name") ?? "",
      value: form.get("value"), extra: form.get("extra") ?? "", pay_url: form.get("pay_url") ?? "", sort: form.get("sort") ?? 0,
      active: form.get("active") === "on" ? "true" : "false",
    });
    await rpc("save_payment_method", { p: { ...p, active: p.active === "true" } }, "user");
  } catch (e) {
    result = `err=${e instanceof RpcError ? e.code : e instanceof z.ZodError ? "invalid_input" : "unexpected_error"}`;
    if (!(e instanceof RpcError) && !(e instanceof z.ZodError)) console.error("savePaymentMethod", e);
  }
  redirect({ href: `/app/admin/finance?tab=methods&${result}`, locale: l });
}
