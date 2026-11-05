"use client";

import { useActionState, useState } from "react";
import { IconStar } from "@/components/Icons";
import { submitReview } from "../actions";

type Labels = { title: string; intro: string; rate: string; body: string; bodyHint: string; send: string; sending: string;
  stars: string[]; errors: Record<string, string>; thanks: string };

/** Star rating + optional text. Works without JavaScript too (plain radio buttons and a form). */
export function ReviewForm({ token, labels }: { token: string; labels: Labels }) {
  const [state, action, pending] = useActionState(async (_: unknown, f: FormData) => submitReview(f), undefined);
  const [value, setValue] = useState(0);
  const [hover, setHover] = useState(0);
  if (state && "ok" in state) return <p role="status" className="rounded-card bg-success-tint p-4 font-semibold text-success">{labels.thanks}</p>;
  const shown = hover || value;
  return (
    <form action={action} className="flex flex-col gap-3 rounded-card border-2 border-apricot bg-apricot-tint p-4">
      <input type="hidden" name="token" value={token} />
      <div className="font-bold">{labels.title}</div>
      <p className="text-[14px]">{labels.intro}</p>
      <fieldset>
        <legend className="mb-1 text-small font-bold">{labels.rate}</legend>
        <div className="flex gap-1" onPointerLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="btn-press cursor-pointer rounded-full p-1 focus-within:ring-2 focus-within:ring-discovery" onPointerEnter={() => setHover(n)}>
              <input type="radio" name="rating" value={n} required className="sr-only" onChange={() => setValue(n)} aria-label={labels.stars[n - 1]} />
              <IconStar size={34} filled={n <= shown} className={n <= shown ? "text-apricot drop-shadow-sm" : "text-[#C9CDDA]"} />
            </label>
          ))}
        </div>
        <span className="mt-1 block min-h-5 text-small font-semibold" aria-live="polite">{shown ? labels.stars[shown - 1] : ""}</span>
      </fieldset>
      <label className="flex flex-col gap-1 text-small font-bold">{labels.body}
        <textarea name="body" maxLength={1500} rows={4} className="rounded-control border border-[#8A90A6] bg-white p-3 font-normal" />
        <span className="font-normal text-ink-muted">{labels.bodyHint}</span>
      </label>
      {state && "error" in state && <p role="alert" className="font-semibold text-critical">{labels.errors[state.error] ?? labels.errors.unexpected_error}</p>}
      <button disabled={pending} className="btn-press min-h-12 rounded-control bg-discovery font-bold text-white hover:bg-discovery-hover disabled:opacity-70">{pending ? labels.sending : labels.send}</button>
    </form>
  );
}
