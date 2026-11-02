"use client";

import { useEffect, useState } from "react";

let cached: Promise<boolean> | null = null;

/** Whether the visitor is signed in. Public pages stay cacheable; this is asked once per page load. */
export function useSignedIn() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    cached ??= fetch("/api/session", { cache: "no-store" }).then((r) => r.json()).then((j) => !!j.signedIn).catch(() => false);
    let live = true;
    cached.then((v) => { if (live) setSignedIn(v); });
    return () => { live = false; };
  }, []);
  return signedIn;
}
