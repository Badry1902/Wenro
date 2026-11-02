"use client";

import { useEffect, useRef, useState } from "react";

type Detector = { detect: (src: HTMLVideoElement) => Promise<{ rawValue: string }[]> };

/**
 * Camera scan of the voucher QR, where the phone's browser supports it (Chrome on Android).
 * Elsewhere the button is hidden and staff tap "Check in" in the list instead.
 */
export function QrScanner({ label, stopLabel, onCodeField }: { label: string; stopLabel: string; onCodeField: string }) {
  const [supported, setSupported] = useState(false);
  const [on, setOn] = useState(false);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => { setSupported(typeof window !== "undefined" && "BarcodeDetector" in window); }, []);

  useEffect(() => {
    if (!on) return;
    let stream: MediaStream | undefined;
    let stop = false;
    (async () => {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (!video.current) return;
      video.current.srcObject = stream;
      await video.current.play();
      const Ctor = (window as unknown as { BarcodeDetector: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
      const detector = new Ctor({ formats: ["qr_code"] });
      while (!stop) {
        const found = await detector.detect(video.current).catch(() => []);
        const code = found[0]?.rawValue;
        if (code) {
          const input = document.getElementById(onCodeField) as HTMLInputElement | null;
          if (input) { input.value = code; input.form?.requestSubmit(); }
          stop = true;
          break;
        }
        await new Promise((r) => setTimeout(r, 300));
      }
    })().catch(() => setOn(false));
    return () => { stop = true; stream?.getTracks().forEach((tr) => tr.stop()); };
  }, [on, onCodeField]);

  if (!supported) return null;
  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={() => setOn(!on)}
        className="btn-press inline-flex min-h-11 items-center justify-center rounded-control bg-ink px-4 font-bold text-white">
        {on ? stopLabel : label}
      </button>
      {on && (
        <div className="pop-in relative w-full max-w-xs overflow-hidden rounded-card" style={{ "--scan-h": "320px" } as React.CSSProperties}>
          <video ref={video} muted playsInline className="aspect-square w-full bg-black object-cover" />
          <span aria-hidden="true" className="scan-line absolute inset-x-4 top-0 h-0.5 rounded bg-apricot shadow-[0_0_12px_2px_rgba(245,154,107,0.8)]" />
        </div>
      )}
    </div>
  );
}
