import "server-only";
import { createHash } from "node:crypto";

/**
 * Cloudinary (photos and videos). Keys live only in the server's environment:
 *   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME  (public)     CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET  (secret)
 * Browsers upload straight to Cloudinary with a short-lived signature made here, so large videos never pass
 * through our server, and nobody can upload without permission from the WENRO server.
 */
export function cloudinaryConfig() {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret) return null;
  return {
    cloud, key, secret,
    folder: (process.env.CLOUDINARY_FOLDER ?? "wenro").replace(/[^a-z0-9_-]/gi, ""),
    api: (process.env.CLOUDINARY_API_BASE ?? "https://api.cloudinary.com").replace(/\/$/, ""),
  };
}

const sha1 = (s: string) => createHash("sha1").update(s).digest("hex");

/** Cloudinary request signature: parameters sorted by name, joined as k=v&k=v, followed by the secret. */
export function signParams(params: Record<string, string | number>, secret: string) {
  const base = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("&");
  return sha1(base + secret);
}

/** Proves an upload result really came from Cloudinary for our account (signed with our secret). */
export function verifyUploadSignature(publicId: string, version: number | string, signature: string, secret: string) {
  return /^[a-f0-9]{40}$/.test(signature) && sha1(`public_id=${publicId}&version=${version}${secret}`) === signature;
}

export const ALLOWED_FORMATS = "jpg,jpeg,png,webp,mp4,mov,webm";
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

export async function destroyAsset(publicId: string, type: "image" | "video") {
  const c = cloudinaryConfig();
  if (!c) return;
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { invalidate: "true", public_id: publicId, timestamp };
  const body = new URLSearchParams({ ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])), api_key: c.key, signature: signParams(params, c.secret) });
  const res = await fetch(`${c.api}/v1_1/${c.cloud}/${type}/destroy`, { method: "POST", body, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`cloudinary destroy ${res.status}`);
}
