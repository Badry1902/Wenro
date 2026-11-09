"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { deletePushSubscription, savePushSubscription } from "@/app/[locale]/app/push-actions";

type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function b64ToBytes(b64: string) {
  const s = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

/**
 * "Get alerts on this device" and "Install the app": alerts for new bookings, requests and payouts arrive
 * on the phone or computer even when WENRO is closed. On iPhone this works after adding WENRO to the
 * home screen (Share → Add to Home Screen), which the panel explains.
 */
export function PushSetup({ dark = false }: { dark?: boolean }) {
  const t = useTranslations("app.push");
  const locale = useLocale();
  const [state, setState] = useState<"unsupported" | "off" | "on" | "denied" | "busy">("busy");
  const [install, setInstall] = useState<BIP | null>(null);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const onBip = (e: Event) => { e.preventDefault(); setInstall(e as BIP); };
    window.addEventListener("beforeinstallprompt", onBip);
    const standalone = matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone);
    (async () => {
      if (!KEY || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setState("unsupported");
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.register("/sw.js");
      const s = await reg.pushManager.getSubscription();
      setState(s ? "on" : "off");
    })().catch(() => setState("unsupported"));
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  const enable = async () => {
    setState("busy");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setState(perm === "denied" ? "denied" : "off");
      const reg = await navigator.serviceWorker.register("/sw.js");
      const s = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(KEY) }));
      await savePushSubscription(JSON.stringify(s.toJSON()), locale);
      setState("on");
    } catch { setState("off"); }
  };
  const disable = async () => {
    setState("busy");
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const s = await reg?.pushManager.getSubscription();
    if (s) { await deletePushSubscription(s.endpoint); await s.unsubscribe(); }
    setState("off");
  };

  const btn = dark
    ? "btn-press min-h-11 w-full rounded-control border border-white/25 px-3 text-start text-small font-semibold text-white/90 hover:bg-white/10"
    : "btn-press min-h-11 rounded-control border border-line px-4 text-small font-bold hover:border-discovery hover:text-discovery";
  const note = dark ? "px-1 text-[12px] text-white/60" : "text-small text-ink-muted";

  return (
    <div className="flex flex-col gap-2">
      {state === "off" && <button type="button" onClick={enable} className={btn}>🔔 {t("enable")}</button>}
      {state === "on" && <button type="button" onClick={disable} className={btn}>✓ {t("on")}</button>}
      {state === "denied" && <p className={note}>{t("denied")}</p>}
      {state === "unsupported" && ios && <p className={note}>{t("ios")}</p>}
      {install && <button type="button" className={btn} onClick={async () => { await install.prompt(); setInstall(null); }}>📲 {t("install")}</button>}
    </div>
  );
}
