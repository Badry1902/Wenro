import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { dataMode } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/admin";
import { cloudinaryConfig, destroyAsset } from "@/lib/cloudinary";
import { cloudinaryParts } from "@/lib/media";

const BUCKET = "experience-media";
export const MAX_PHOTO_BYTES = 4 * 1024 * 1024; // Vercel limits request bodies to 4.5 MB
// Local developer database only: files live outside /public (Next serves /public only as built).
export const DEV_DIR = path.join(process.cwd(), ".dev-uploads");

/** Checks the real file type from its first bytes, not from the name or the browser's claim. */
export function sniffImage(buf: Buffer): { type: string; ext: string } | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { type: "image/jpeg", ext: "jpg" };
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { type: "image/png", ext: "png" };
  if (buf.length > 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return { type: "image/webp", ext: "webp" };
  return null;
}

/** Stores a photo and returns the public URL (Supabase Storage, or a local folder in developer mode). */
export async function storePhoto(experienceId: string, buf: Buffer, kind: { type: string; ext: string }) {
  const name = `${experienceId}/${randomUUID()}.${kind.ext}`;
  if (dataMode() === "localpg") {
    await mkdir(path.join(DEV_DIR, experienceId), { recursive: true });
    await writeFile(path.join(DEV_DIR, name), buf);
    return `/api/dev-media/${name}`;
  }
  const s = createServiceClient().storage.from(BUCKET);
  const { error } = await s.upload(name, buf, { contentType: kind.type, cacheControl: "31536000", upsert: false });
  if (error) throw new Error(`upload_failed: ${error.message}`);
  return s.getPublicUrl(name).data.publicUrl;
}

/** Deletes a stored photo if it is one of ours (demo illustrations under /demo are left alone). */
export async function deletePhoto(url: string) {
  try {
    const cl = cloudinaryParts(url);
    if (cl) {
      const c = cloudinaryConfig();
      if (c && cl.cloud === c.cloud && cl.publicId.startsWith(`${c.folder}/`)) await destroyAsset(cl.publicId, cl.type);
      return;
    }
    if (url.startsWith("/api/dev-media/")) {
      const rel = url.slice("/api/dev-media/".length);
      if (/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(rel)) await unlink(path.join(DEV_DIR, rel));
      return;
    }
    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const i = url.indexOf(marker);
    if (i >= 0) await createServiceClient().storage.from(BUCKET).remove([url.slice(i + marker.length)]);
  } catch (e) {
    console.error("deletePhoto", e);
  }
}

export async function readDevPhoto(rel: string) {
  if (dataMode() !== "localpg" || !/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(rel)) return null;
  return readFile(path.join(DEV_DIR, rel)).catch(() => null);
}
