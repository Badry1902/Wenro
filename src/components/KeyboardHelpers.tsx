"use client";

import { useEffect } from "react";

/**
 * Small page-wide helpers (mounted once in the root layout):
 *  - small pop-overs built on <details data-popover> close on Escape and on a click outside;
 *  - Alt+← / Alt+→ already work in browsers; nothing to add there.
 */
export function KeyboardHelpers() {
  useEffect(() => {
    const openOnes = () => Array.from(document.querySelectorAll<HTMLDetailsElement>("details[data-popover][open]"));
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const list = openOnes();
      if (list.length) { list.forEach((d) => { d.open = false; }); list[0].querySelector("summary")?.focus(); }
    };
    const onDown = (e: PointerEvent) => {
      for (const d of openOnes()) if (!d.contains(e.target as Node)) d.open = false;
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("pointerdown", onDown); };
  }, []);
  return null;
}
