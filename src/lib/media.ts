/**
 * Media URLs. Files stored at Cloudinary are delivered through its CDN with automatic format and quality
 * (WebP/AVIF for photos, efficient codecs for video) and resized to what the page needs, which keeps
 * bandwidth and storage low. Other URLs (Supabase Storage, demo illustrations) are used as they are.
 */
const CLOUDINARY = /^https:\/\/res\.cloudinary\.com\/([^/]+)\/(image|video)\/upload\/(.+)$/;

export function cloudinaryParts(url: string) {
  const m = CLOUDINARY.exec(url);
  if (!m) return null;
  const rest = m[3]; // [v123/]folder/name[.ext]
  const noVersion = rest.replace(/^v\d+\//, "");
  return { cloud: m[1], type: m[2] as "image" | "video", publicId: noVersion.replace(/\.[a-z0-9]+$/i, ""), rest };
}

type Size = { w: number; h?: number };
const tr = ({ w, h }: Size) => `f_auto,q_auto,c_fill,${h ? `h_${h},` : ""}w_${w}`;

/** Photo (or video) URL resized for display. */
export function mediaSrc(url: string, size: Size) {
  const p = cloudinaryParts(url);
  if (!p) return url;
  return `https://res.cloudinary.com/${p.cloud}/${p.type}/upload/${tr(size)}/${p.rest}`;
}

/** Still frame for a video (used as poster and as a card cover). */
export function videoPoster(url: string, size: Size) {
  const p = cloudinaryParts(url);
  if (!p || p.type !== "video") return null;
  return `https://res.cloudinary.com/${p.cloud}/video/upload/so_1,${tr(size)}/${p.publicId}.jpg`;
}
