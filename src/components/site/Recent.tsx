"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { ExperienceCard } from "@/lib/data/types";
import { Rail, RailItem } from "./Rail";
import { TripCard } from "./TripCard";

const KEY = "wenro.recent";
const read = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; } };

/** Remembers the trips this browser looked at (last 8). Stays on this device only. */
export function RecentTracker({ id }: { id: string }) {
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify([id, ...read().filter((x) => x !== id)].slice(0, 8))); } catch { /* private mode */ }
  }, [id]);
  return null;
}

/** "Recently viewed" row on the home page; hidden until the visitor has looked at a trip. */
export function RecentRail({ cards }: { cards: ExperienceCard[] }) {
  const t = useTranslations();
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => setIds(read()), []);
  const list = ids.map((id) => cards.find((c) => c.id === id)).filter((c): c is ExperienceCard => !!c);
  if (list.length === 0) return null;
  return (
    <section className="pop-in mt-16">
      <h2 className="mb-5 text-[26px] font-extrabold leading-tight md:text-[32px]">{t("recent.title")}</h2>
      <Rail labels={{ prev: t("home.prev"), next: t("home.next") }}>
        {list.map((c) => <RailItem key={c.id}><TripCard c={c} size="sm" /></RailItem>)}
      </Rail>
    </section>
  );
}

/** The wishlist page: trips saved with the heart, on this device. */
export function WishlistGrid({ cards }: { cards: ExperienceCard[] }) {
  const t = useTranslations();
  const [ids, setIds] = useState<string[] | null>(null);
  useEffect(() => {
    const load = () => { try { setIds(JSON.parse(localStorage.getItem("wenro.wishlist") ?? "[]")); } catch { setIds([]); } };
    load();
    window.addEventListener("wenro-wishlist", load);
    return () => window.removeEventListener("wenro-wishlist", load);
  }, []);
  if (ids === null) return null;
  const list = cards.filter((c) => ids.includes(c.id));
  if (list.length === 0) return <p className="rounded-card border border-dashed border-line px-6 py-16 text-center text-ink-muted">{t("wishlist.empty")}</p>;
  return <ul className="stagger grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{list.map((c) => <li key={c.id}><TripCard c={c} /></li>)}</ul>;
}

/** Heart in the header with the number of saved trips. */
export function WishCount() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const load = () => { try { setN(JSON.parse(localStorage.getItem("wenro.wishlist") ?? "[]").length); } catch { setN(0); } };
    load();
    window.addEventListener("wenro-wishlist", load);
    window.addEventListener("storage", load);
    return () => { window.removeEventListener("wenro-wishlist", load); window.removeEventListener("storage", load); };
  }, []);
  return n > 0 ? <span className="pop-in absolute -end-1 -top-1 grid min-w-5 place-items-center rounded-full bg-[#e0464f] px-1 text-[11px] font-bold text-white">{n}</span> : null;
}
