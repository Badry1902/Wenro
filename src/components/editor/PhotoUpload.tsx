"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

function Submit({ label, pending, disabled }: { label: string; pending: string; disabled: boolean }) {
  const { pending: busy } = useFormStatus();
  return (
    <button disabled={disabled || busy} className="btn-press inline-flex min-h-11 items-center gap-2 rounded-control bg-discovery px-4 font-bold text-white disabled:opacity-60">
      {busy && <span className="spinner" aria-hidden="true" />}{busy ? pending : label}
    </button>
  );
}

/** File picker with an instant local preview, so people see what they are about to upload. */
export function PhotoUpload({ labels }: { labels: { choose: string; alt: string; upload: string; uploading: string; hint: string; tooBig: string } }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [tooBig, setTooBig] = useState(false);
  return (
    <div className="flex flex-wrap items-end gap-3">
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="" className="pop-in h-20 w-28 rounded-[12px] object-cover" />
      )}
      <label className="flex flex-col gap-1.5 text-small font-bold">{labels.choose}
        <input type="file" name="photo" required accept="image/jpeg,image/png,image/webp" className="text-small file:me-3 file:min-h-11 file:rounded-control file:border file:border-line file:bg-surface file:px-3 file:font-semibold"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setTooBig(!!f && f.size > 4 * 1024 * 1024);
            setPreview((old) => { if (old) URL.revokeObjectURL(old); return f ? URL.createObjectURL(f) : null; });
          }} />
      </label>
      <label className="flex min-w-48 flex-1 flex-col gap-1.5 text-small font-bold">{labels.alt}
        <input name="alt" maxLength={200} className="min-h-11 rounded-control border border-[#8A90A6] px-3" />
      </label>
      <Submit label={labels.upload} pending={labels.uploading} disabled={tooBig} />
      <p className={`w-full text-small ${tooBig ? "font-semibold text-critical" : "text-ink-muted"}`}>{tooBig ? labels.tooBig : labels.hint}</p>
    </div>
  );
}
