"use client";

import { useState } from "react";

type Props = { photo: string | null; title: string; price: string; qrSvg: string; code: string; cta: string; rtl: boolean; fileName: string;
  labels: { make: string; making: string; download: string; share: string } };

const load = (src: string) => new Promise<HTMLImageElement>((ok, bad) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => ok(i); i.onerror = bad; i.src = src; });

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const words = text.split(/\s+/); const lines: string[] = []; let line = "";
  for (const w of words) { const t = line ? `${line} ${w}` : w; if (ctx.measureText(t).width > max && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}

/** Makes a 1080×1920 story image (photo, title, price, the partner's QR and code) in the browser. */
export function StoryMaker({ photo, title, price, qrSvg, code, cta, rtl, fileName, labels }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);

  const make = async () => {
    setBusy(true);
    try {
      const W = 1080, H = 1920; const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d")!;
      g.fillStyle = "#3046d9"; g.fillRect(0, 0, W, H);
      if (photo) {
        try { const im = await load(photo); const s = Math.max(W / im.width, H / im.height); g.drawImage(im, (W - im.width * s) / 2, (H - im.height * s) / 2, im.width * s, im.height * s); } catch { /* keep the blue background */ }
      }
      const grad = g.createLinearGradient(0, H * 0.35, 0, H); grad.addColorStop(0, "rgba(18,24,48,0)"); grad.addColorStop(1, "rgba(18,24,48,0.92)");
      g.fillStyle = grad; g.fillRect(0, 0, W, H);
      // logo badge
      try { const logo = await load("/brand/logo-horizontal-temp.png"); const lw = 300, lh = lw * (logo.height / logo.width);
        g.fillStyle = "#fff"; g.beginPath(); g.roundRect(60, 70, lw + 60, lh + 50, 28); g.fill(); g.drawImage(logo, 90, 95, lw, lh); } catch { /* no logo */ }
      g.direction = rtl ? "rtl" : "ltr"; g.textAlign = rtl ? "right" : "left";
      const x = rtl ? W - 70 : 70;
      g.fillStyle = "#fff"; g.font = "800 76px Manrope, 'IBM Plex Sans Arabic', system-ui, sans-serif";
      const lines = wrap(g, title, W - 140); let y = 1180 - (lines.length - 1) * 88;
      for (const l of lines) { g.fillText(l, x, y); y += 88; }
      g.font = "700 52px Manrope, 'IBM Plex Sans Arabic', system-ui, sans-serif"; g.fillStyle = "#f59a6b"; g.fillText(price, x, y + 10);
      // QR card
      const qr = await load(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrSvg)}`);
      const qx = rtl ? 70 : W - 70 - 380, qy = 1420;
      g.fillStyle = "#fff"; g.beginPath(); g.roundRect(qx, qy, 380, 440, 32); g.fill(); g.drawImage(qr, qx + 30, qy + 30, 320, 320);
      g.fillStyle = "#232B45"; g.textAlign = "center"; g.direction = "ltr"; g.font = "800 40px Manrope, system-ui, sans-serif"; g.fillText(code, qx + 190, qy + 405);
      g.direction = rtl ? "rtl" : "ltr"; g.textAlign = rtl ? "right" : "left"; g.fillStyle = "#fff"; g.font = "700 46px Manrope, 'IBM Plex Sans Arabic', system-ui, sans-serif";
      const ctaLines = wrap(g, cta, W - 140 - 420); let cy = 1600; for (const l of ctaLines) { g.fillText(l, x, cy); cy += 58; }
      const b = await new Promise<Blob | null>((ok) => c.toBlob(ok, "image/png"));
      if (b) { setBlob(b); setUrl(URL.createObjectURL(b)); }
    } finally { setBusy(false); }
  };
  const share = async () => {
    if (!blob) return;
    const file = new File([blob], `${fileName}.png`, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file] }).catch(() => {});
  };
  const b = "btn-press inline-flex min-h-10 items-center rounded-control border border-line px-3 text-small font-bold hover:border-discovery hover:text-discovery";
  return (
    <div className="flex flex-col gap-2">
      {!url ? <button type="button" onClick={make} disabled={busy} className={b}>{busy ? labels.making : labels.make}</button> : (
        <div className="flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="h-40 w-[90px] rounded-[10px] border border-line object-cover" />
          <div className="flex flex-col gap-2">
            <a href={url} download={`${fileName}.png`} className={b}>{labels.download}</a>
            {typeof navigator !== "undefined" && "share" in navigator && <button type="button" onClick={share} className={b}>{labels.share}</button>}
          </div>
        </div>
      )}
    </div>
  );
}
