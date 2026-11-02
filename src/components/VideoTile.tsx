"use client";

import { useEffect, useState } from "react";

/** A short muted loop in the gallery. With "reduce motion" on, it stays still until the visitor presses play. */
export function VideoTile({ src, poster, label }: { src: string; poster: string | null; label: string }) {
  const [still, setStill] = useState(true);
  useEffect(() => { setStill(window.matchMedia("(prefers-reduced-motion: reduce)").matches); }, []);
  return (
    <video key={still ? "still" : "auto"} src={src} poster={poster ?? undefined} aria-label={label}
      muted loop playsInline preload={still ? "none" : "metadata"} autoPlay={!still} controls={still}
      className="h-full w-full object-cover" />
  );
}
