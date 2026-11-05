"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Sends one anonymous page-view count per public page (not dashboards, bookings or sign-in). */
export function VisitBeacon() {
  const path = usePathname();
  useEffect(() => {
    if (!path || /^\/[a-z]{2}\/(app|booking|signin|book)(\/|$)/.test(path)) return;
    const slug = path.match(/^\/[a-z]{2}\/experiences\/([a-z0-9-]+)$/)?.[1] ?? null;
    const body = JSON.stringify({ slug });
    if (!navigator.sendBeacon?.("/api/visit", new Blob([body], { type: "application/json" }))) {
      fetch("/api/visit", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => {});
    }
  }, [path]);
  return null;
}
