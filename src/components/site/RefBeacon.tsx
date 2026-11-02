"use client";

import { useEffect } from "react";

/** When the page was opened through a partner link (?ref=CODE), count the visit once. */
export function RefBeacon({ experienceId }: { experienceId: string }) {
  useEffect(() => {
    const code = new URLSearchParams(location.search).get("ref");
    if (!code || !/^[A-Za-z0-9]{4,20}$/.test(code)) return;
    const key = `wenro.click.${code}.${experienceId}`;
    try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, "1"); } catch { /* still count */ }
    fetch("/api/click", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code, experience: experienceId }), keepalive: true }).catch(() => {});
  }, [experienceId]);
  return null;
}
