"use client";

import { useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { finishUpload, startUpload } from "@/app/[locale]/app/editor-actions";

type Labels = {
  choose: string; alt: string; upload: string; uploading: string; saving: string; done: string; hint: string;
  tooBigImage: string; tooBigVideo: string; errors: Record<string, string>;
};

const IMAGE = ["image/jpeg", "image/png", "image/webp"];
const VIDEO = ["video/mp4", "video/quicktime", "video/webm"];

/**
 * Photos and videos go straight from the browser to Cloudinary (signed by our server for this experience
 * only), with a progress bar. Then our server checks Cloudinary's signature and records the file.
 */
export function MediaUpload({ experienceId, labels }: { experienceId: string; labels: Labels }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [alt, setAlt] = useState("");
  const [phase, setPhase] = useState<"idle" | "uploading" | "saving" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const isVideo = !!file && VIDEO.includes(file.type);
  const pick = (f: File | null) => {
    setError(null); setPhase("idle"); setProgress(0);
    if (preview) URL.revokeObjectURL(preview);
    if (f && !IMAGE.includes(f.type) && !VIDEO.includes(f.type)) { setFile(null); setPreview(null); setError(labels.errors.photo_type); return; }
    if (f && IMAGE.includes(f.type) && f.size > 10 * 1024 * 1024) { setFile(null); setPreview(null); setError(labels.tooBigImage); return; }
    if (f && VIDEO.includes(f.type) && f.size > 100 * 1024 * 1024) { setFile(null); setPreview(null); setError(labels.tooBigVideo); return; }
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  };
  const fail = (code: string) => { setPhase("idle"); setError(labels.errors[code] ?? labels.errors.unexpected_error); };

  async function upload() {
    if (!file) return;
    setError(null); setPhase("uploading"); setProgress(0);
    const ticket = await startUpload(experienceId);
    if (ticket.mode !== "cloudinary") return fail(ticket.mode === "error" ? ticket.error : "unexpected_error");
    const body = new FormData();
    for (const [k, v] of Object.entries(ticket.fields)) body.append(k, v);
    body.append("file", file);
    const result = await new Promise<Record<string, unknown> | null>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", ticket.url);
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100)); };
      xhr.onload = () => { try { resolve(xhr.status < 300 ? JSON.parse(xhr.responseText) : null); } catch { resolve(null); } };
      xhr.onerror = () => resolve(null);
      xhr.send(body);
    });
    if (!result) return fail("upload_failed");
    setPhase("saving");
    const saved = await finishUpload({
      experience: experienceId, public_id: result.public_id, version: result.version, signature: result.signature,
      resource_type: result.resource_type, alt,
    });
    if ("error" in saved) return fail(saved.error);
    setPhase("done");
    setFile(null); setAlt("");
    if (input.current) input.current.value = "";
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    router.refresh();
  }

  const busy = phase === "uploading" || phase === "saving";
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        {preview && (isVideo
          ? <video src={preview} muted playsInline className="pop-in h-20 w-28 rounded-[12px] bg-black object-cover" />
          // eslint-disable-next-line @next/next/no-img-element
          : <img src={preview} alt="" className="pop-in h-20 w-28 rounded-[12px] object-cover" />)}
        <label className="flex flex-col gap-1.5 text-small font-bold">{labels.choose}
          <input ref={input} type="file" accept={[...IMAGE, ...VIDEO].join(",")} disabled={busy}
            className="text-small file:me-3 file:min-h-11 file:rounded-control file:border file:border-line file:bg-surface file:px-3 file:font-semibold"
            onChange={(e) => pick(e.target.files?.[0] ?? null)} />
        </label>
        <label className="flex min-w-48 flex-1 flex-col gap-1.5 text-small font-bold">{labels.alt}
          <input value={alt} onChange={(e) => setAlt(e.target.value)} maxLength={200} disabled={busy} className="min-h-11 rounded-control border border-[#8A90A6] px-3" />
        </label>
        <button type="button" onClick={upload} disabled={!file || busy} aria-busy={busy}
          className="btn-press inline-flex min-h-11 items-center gap-2 rounded-control bg-discovery px-4 font-bold text-white disabled:opacity-60">
          {busy && <span className="spinner" aria-hidden="true" />}
          {phase === "uploading" ? `${labels.uploading} ${progress}%` : phase === "saving" ? labels.saving : labels.upload}
        </button>
      </div>
      {phase === "uploading" && (
        <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label={labels.uploading}
          className="h-1.5 w-full overflow-hidden rounded-full bg-line">
          <div className="upload-bar h-full w-full rounded-full bg-discovery" style={{ transform: `scaleX(${progress / 100})` }} />
        </div>
      )}
      <p aria-live="polite" className={`text-small ${error ? "font-semibold text-critical" : phase === "done" ? "font-semibold text-success" : "text-ink-muted"}`}>
        {error ?? (phase === "done" ? labels.done : labels.hint)}
      </p>
    </div>
  );
}
