import { readDevPhoto } from "@/lib/storage";

// Serves photos uploaded in developer mode (local database). Returns 404 everywhere else.
// Two plain segments (experience id / file name); readDevPhoto checks both strictly.
export async function GET(_: Request, { params }: { params: Promise<{ exp: string; file: string }> }) {
  const { exp, file } = await params;
  const rel = `${exp}/${file}`;
  const buf = await readDevPhoto(rel);
  if (!buf) return new Response("Not found", { status: 404 });
  const type = rel.endsWith(".png") ? "image/png" : rel.endsWith(".webp") ? "image/webp" : "image/jpeg";
  return new Response(new Uint8Array(buf), { headers: { "Content-Type": type, "Cache-Control": "public, max-age=3600" } });
}
