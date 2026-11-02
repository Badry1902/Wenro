"use client";

import { useMemo, useState } from "react";
import { CopyButton } from "./CopyButton";

type Item = { title: string; url: string };
type Labels = { more: string; search: string; copy: string; copied: string; whatsapp: string; telegram: string; facebook: string; message: string; none: string };

/** Ready-to-share links for every trip: copy, or open WhatsApp / Telegram / Facebook with the link filled in. */
export function ShareKit({ items, labels }: { items: Item[]; labels: Labels }) {
  const [q, setQ] = useState("");
  const [all, setAll] = useState(false);
  const list = useMemo(() => items.filter((i) => i.title.toLowerCase().includes(q.trim().toLowerCase())), [items, q]);
  const share = (net: "wa" | "tg" | "fb", it: Item) => {
    const text = `${it.title}\n${labels.message}`;
    const u = encodeURIComponent(it.url), m = encodeURIComponent(text);
    return net === "wa" ? `https://wa.me/?text=${m}%0A${u}` : net === "tg" ? `https://t.me/share/url?url=${u}&text=${m}` : `https://www.facebook.com/sharer/sharer.php?u=${u}`;
  };
  const chip = "btn-press inline-flex min-h-11 items-center gap-1.5 rounded-control border border-line px-3 text-small font-bold hover:border-discovery hover:text-discovery";
  return (
    <div>
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={labels.search} aria-label={labels.search}
        className="mb-3 min-h-11 w-full rounded-control border border-[#8A90A6] px-3" />
      {list.length === 0 ? <p className="text-ink-muted">{labels.none}</p> : (
        <ul className="divide-y divide-line">
          {(all || q ? list : list.slice(0, 6)).map((it) => (
            <li key={it.url} className="flex flex-col gap-2 py-3 lg:flex-row lg:items-center lg:justify-between">
              <span className="min-w-0 font-semibold">{it.title}</span>
              <span className="flex flex-wrap gap-2">
                <CopyButton text={it.url} label={labels.copy} done={labels.copied} />
                <a href={share("wa", it)} target="_blank" rel="noopener noreferrer" className={chip}>{labels.whatsapp}</a>
                <a href={share("tg", it)} target="_blank" rel="noopener noreferrer" className={chip}>{labels.telegram}</a>
                <a href={share("fb", it)} target="_blank" rel="noopener noreferrer" className={chip}>{labels.facebook}</a>
              </span>
            </li>
          ))}
        </ul>
      )}
      {!all && !q && list.length > 6 && (
        <button type="button" onClick={() => setAll(true)} className="btn-press mt-2 min-h-11 w-full rounded-control border border-line font-bold hover:border-discovery hover:text-discovery">
          {labels.more.replace("{n}", String(list.length - 6))}
        </button>
      )}
    </div>
  );
}

/** Save the QR code as SVG (print shops) or PNG (social posts). */
export function QrDownload({ svg, name, labels }: { svg: string; name: string; labels: { svg: string; png: string } }) {
  const save = (blob: Blob, ext: string) => {
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${name}.${ext}`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const png = () => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas"); c.width = c.height = 1024;
      const g = c.getContext("2d")!; g.fillStyle = "#fff"; g.fillRect(0, 0, 1024, 1024); g.drawImage(img, 0, 0, 1024, 1024);
      c.toBlob((b) => b && save(b, "png"), "image/png");
    };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  };
  const b = "btn-press min-h-10 rounded-control border border-line px-3 text-small font-bold hover:border-discovery hover:text-discovery";
  return (
    <div className="flex gap-2">
      <button type="button" className={b} onClick={png}>{labels.png}</button>
      <button type="button" className={b} onClick={() => save(new Blob([svg], { type: "image/svg+xml" }), "svg")}>{labels.svg}</button>
    </div>
  );
}
