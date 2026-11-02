"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { IconHeart } from "../Icons";

const KEY = "wenro.wishlist";
const read = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; } };

/** Heart toggle. The wishlist lives in this browser only (a per-visitor convenience, no account needed). */
export function WishButton({ id, className = "", variant = "photo" }: { id: string; className?: string; variant?: "photo" | "plain" }) {
  const t = useTranslations("wish");
  const [on, setOn] = useState(false);
  const [pop, setPop] = useState(0);
  useEffect(() => {
    setOn(read().includes(id));
    const sync = () => setOn(read().includes(id));
    window.addEventListener("wenro-wishlist", sync);
    return () => window.removeEventListener("wenro-wishlist", sync);
  }, [id]);
  const toggle = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const list = read();
    const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* private mode: keep it for this page only */ }
    setOn(next.includes(id));
    setPop((n) => n + 1);
    window.dispatchEvent(new Event("wenro-wishlist"));
  };
  return (
    <button type="button" onClick={toggle} aria-pressed={on} aria-label={on ? t("saved") : t("save")} title={on ? t("saved") : t("save")}
      className={`btn-press grid size-10 place-items-center rounded-full ${variant === "photo" ? "bg-white/90 shadow-sm backdrop-blur" : "border border-line bg-surface"} ${on ? "text-[#e0464f]" : "text-ink"} ${className}`}>
      <IconHeart key={pop} size={20} filled={on} className={pop ? "heart-pop" : ""} />
    </button>
  );
}
