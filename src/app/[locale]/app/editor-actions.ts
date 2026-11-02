"use server";

import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { rpc, RpcError } from "@/lib/data/rpc";
import { MAX_PHOTO_BYTES, deletePhoto, sniffImage, storePhoto } from "@/lib/storage";
import { ALLOWED_FORMATS, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, cloudinaryConfig, signParams, verifyUploadSignature } from "@/lib/cloudinary";

export type SaveState = { error?: string } | undefined;

const locale = z.enum(["en", "de", "ru", "fr", "ar"]).catch("en");
// Where the editor lives: /app/o/<org>/experiences or /app/admin/experiences
const base = z.string().regex(/^\/app\/(o\/[0-9a-f-]{36}|admin)\/experiences$/);
const guid = z.guid();

const money = z.number().int().min(0).max(10_000_000);
const text = z.string().max(5000).nullable().optional();
const payloadSchema = z.object({
  id: guid.nullable(),
  operator_id: guid.nullable(),
  category_id: guid.nullable(),
  booking_mode: z.enum(["instant", "request"]),
  duration_minutes: z.number().int().min(15).max(2880).nullable(),
  cancellation_policy_id: guid.nullable(),
  private_available: z.boolean(),
  private_max_group: z.number().int().min(1).max(100).nullable(),
  translations: z.partialRecord(z.enum(["en", "de", "ru", "fr", "ar"]), z.record(z.string(), text)),
  prices: z.partialRecord(z.enum(["adult", "child", "infant", "private_group"]), z.object({
    net_minor: money, age_min: z.number().int().min(0).max(99).nullable().optional(),
    age_max: z.number().int().min(0).max(99).nullable().optional(), max_group: z.number().int().min(1).max(100).nullable().optional(),
  }).passthrough()),
  extras: z.array(z.object({ id: guid.nullable(), net_minor: money, per: z.enum(["person", "booking"]), names: z.record(z.string(), z.string().max(80)) })).max(20),
  transport: z.array(z.object({ zone_id: guid, net_minor: money, per: z.enum(["vehicle", "person"]), vehicle_capacity: z.number().int().min(1).max(60).nullable() })).max(20),
});

/** Saves the editor. Errors come back to the form (no reload), so nothing typed is lost. */
export async function saveExperience(_: SaveState, form: FormData): Promise<SaveState> {
  const l = locale.parse(form.get("locale"));
  const b = base.safeParse(form.get("base"));
  if (!b.success) return { error: "unexpected_error" };
  let p: z.infer<typeof payloadSchema>;
  try {
    p = payloadSchema.parse(JSON.parse(String(form.get("payload") ?? "")));
  } catch {
    return { error: "invalid_input" };
  }
  let id: string;
  try {
    id = await rpc<string>("save_experience", { p }, "user");
  } catch (e) {
    if (e instanceof RpcError) return { error: e.code };
    console.error("save_experience", e);
    return { error: "unexpected_error" };
  }
  redirect({ href: `${b.data}/${id}?ok=${p.id ? "experience_saved" : "experience_created"}`, locale: l });
}

async function back(form: FormData, result: string) {
  const l = locale.parse(form.get("locale"));
  const b = base.parse(form.get("base"));
  const id = guid.parse(form.get("experience"));
  redirect({ href: `${b}/${id}?${result}#photos`, locale: l });
}

export async function uploadPhoto(form: FormData) {
  const id = guid.parse(form.get("experience"));
  const file = form.get("photo");
  let result = "ok=photo_added";
  try {
    if (!(file instanceof File) || file.size === 0) throw new RpcError("no_file");
    if (file.size > MAX_PHOTO_BYTES) throw new RpcError("photo_too_big");
    const buf = Buffer.from(await file.arrayBuffer());
    const kind = sniffImage(buf);
    if (!kind) throw new RpcError("photo_type");
    await rpc("experience_editor", { p_experience: id }, "user"); // permission check before anything is stored
    const url = await storePhoto(id, buf, kind);
    try {
      await rpc("add_experience_media", { p_experience: id, p_path: url, p_alt: String(form.get("alt") ?? "").slice(0, 200), p_kind: "image" }, "user");
    } catch (e) {
      await deletePhoto(url); // keep storage and database in step
      throw e;
    }
  } catch (e) {
    result = `err=${e instanceof RpcError ? e.code : "unexpected_error"}`;
    if (!(e instanceof RpcError)) console.error("uploadPhoto", e);
  }
  await back(form, result);
}

export async function removePhoto(form: FormData) {
  let result = "ok=photo_removed";
  try {
    const url = await rpc<string>("remove_experience_media", { p_media: guid.parse(form.get("media")) }, "user");
    await deletePhoto(url);
  } catch (e) {
    result = `err=${e instanceof RpcError ? e.code : "unexpected_error"}`;
  }
  await back(form, result);
}

export async function makeCover(form: FormData) {
  let result = "ok=photo_cover";
  try {
    await rpc("move_experience_media", { p_media: guid.parse(form.get("media")), p_first: true }, "user");
  } catch (e) {
    result = `err=${e instanceof RpcError ? e.code : "unexpected_error"}`;
  }
  await back(form, result);
}

// ---- Cloudinary: signed direct upload from the browser (photos and videos) ----

export type UploadTicket =
  | { mode: "cloudinary"; url: string; fields: Record<string, string>; maxImage: number; maxVideo: number }
  | { mode: "server" }
  | { mode: "error"; error: string };

/** Step 1: the server checks the person may edit this experience, then signs one upload into its folder. */
export async function startUpload(experienceId: string): Promise<UploadTicket> {
  const id = guid.safeParse(experienceId);
  if (!id.success) return { mode: "error", error: "unexpected_error" };
  const c = cloudinaryConfig();
  if (!c) return { mode: "server" }; // no Cloudinary keys: photos go through the server to Supabase Storage
  try {
    await rpc("experience_editor", { p_experience: id.data }, "user");
  } catch (e) {
    return { mode: "error", error: e instanceof RpcError ? e.code : "unexpected_error" };
  }
  const params = { allowed_formats: ALLOWED_FORMATS, folder: `${c.folder}/experiences/${id.data}`, timestamp: Math.floor(Date.now() / 1000) };
  return {
    mode: "cloudinary",
    url: `${c.api}/v1_1/${c.cloud}/auto/upload`,
    fields: { ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])), api_key: c.key, signature: signParams(params, c.secret) },
    maxImage: MAX_IMAGE_BYTES, maxVideo: MAX_VIDEO_BYTES,
  };
}

const finishSchema = z.object({
  experience: guid,
  public_id: z.string().regex(/^[A-Za-z0-9_\-/.]{1,200}$/),
  version: z.union([z.number().int(), z.string().regex(/^\d+$/)]),
  signature: z.string().regex(/^[a-f0-9]{40}$/),
  resource_type: z.enum(["image", "video"]),
  alt: z.string().max(200).optional(),
});

/** Step 2: the browser reports the upload; the server checks Cloudinary's signature before recording anything. */
export async function finishUpload(input: unknown): Promise<{ ok: true } | { error: string }> {
  const c = cloudinaryConfig();
  const p = finishSchema.safeParse(input);
  if (!c || !p.success) return { error: "unexpected_error" };
  const d = p.data;
  if (!verifyUploadSignature(d.public_id, d.version, d.signature, c.secret)) return { error: "upload_not_verified" };
  if (!d.public_id.startsWith(`${c.folder}/experiences/${d.experience}/`)) return { error: "upload_not_verified" };
  // Build the address ourselves from verified parts; never store a URL the browser sent.
  const url = `https://res.cloudinary.com/${c.cloud}/${d.resource_type}/upload/v${d.version}/${d.public_id}`;
  try {
    await rpc("add_experience_media", { p_experience: d.experience, p_path: url, p_alt: d.alt ?? "", p_kind: d.resource_type }, "user");
    return { ok: true };
  } catch (e) {
    await deletePhoto(url);
    return { error: e instanceof RpcError ? e.code : "unexpected_error" };
  }
}
