"use client";

import { useEffect, useMemo, useState } from "react";
import { IconCategory, IconClose, IconSearch } from "./Icons";

type Chip = { value: string; label: string; count: number; icon?: string };

const norm = (s: string) => s.toLocaleLowerCase().normalize("NFKD").replace(/[̀-ًͯ-ْ]/g, "");

/**
 * Search box + ready filters for a server-rendered list. Items carry data-filter-item, data-text and
 * data-group (e.g. the activity type); this bar only shows/hides them, so the list itself stays plain HTML.
 */
export function ListFilter({ target, chips, labels, extra }: {
  target: string; chips: Chip[];
  labels: { search: string; all: string; clear: string; results: string; none: string; group: string };
  /** A second row of filters matched against data-{name} (e.g. status). */
  extra?: { name: string; label: string; all: string; chips: Chip[] };
}) {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<string | null>(null);
  const [second, setSecond] = useState<string | null>(null);
  const [shown, setShown] = useState<number | null>(null);
  const total = useMemo(() => chips.reduce((a, c) => a + c.count, 0), [chips]);

  useEffect(() => {
    const box = document.getElementById(target);
    if (!box) return;
    const words = norm(q).split(/\s+/).filter(Boolean);
    let n = 0;
    box.querySelectorAll<HTMLElement>("[data-filter-item]").forEach((el) => {
      const okGroup = (!group || el.dataset.group === group) && (!extra || !second || el.dataset[extra.name] === second);
      const hay = norm(el.dataset.text ?? el.textContent ?? "");
      const okText = words.every((w) => hay.includes(w));
      el.hidden = !(okGroup && okText);
      if (!el.hidden) n++;
    });
    setShown(n);
  }, [q, group, second, target, extra]);

  const chip = (on: boolean) => `btn-press inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-small font-bold ${on ? "border-ink bg-ink text-white" : "border-line bg-surface hover:border-ink"}`;
  return (
    <div className="mb-5 flex flex-col gap-3">
      <label className="flex min-h-12 w-full items-center gap-2 rounded-full border border-line bg-surface px-4 focus-within:border-discovery md:max-w-md">
        <IconSearch size={20} className="text-discovery" />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={labels.search} aria-label={labels.search}
          className="min-w-0 flex-1 bg-transparent outline-none" />
        {q && <button type="button" onClick={() => setQ("")} aria-label={labels.clear} className="grid size-8 place-items-center rounded-full hover:bg-discovery-tint"><IconClose size={16} /></button>}
      </label>
      <div role="group" aria-label={labels.group} className="rail -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <button type="button" aria-pressed={!group} onClick={() => setGroup(null)} className={chip(!group)}>{labels.all} <span className="opacity-70">{total}</span></button>
        {chips.filter((c) => c.count > 0).map((c) => (
          <button key={c.value} type="button" aria-pressed={group === c.value} onClick={() => setGroup(group === c.value ? null : c.value)} className={chip(group === c.value)}>
            {c.icon && <IconCategory name={c.icon} size={16} />}{c.label} <span className="opacity-70">{c.count}</span>
          </button>
        ))}
      </div>
      {extra && (
        <div role="group" aria-label={extra.label} className="rail -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <button type="button" aria-pressed={!second} onClick={() => setSecond(null)} className={chip(!second)}>{extra.all}</button>
          {extra.chips.filter((c) => c.count > 0).map((c) => (
            <button key={c.value} type="button" aria-pressed={second === c.value} onClick={() => setSecond(second === c.value ? null : c.value)} className={chip(second === c.value)}>
              {c.label} <span className="opacity-70">{c.count}</span>
            </button>
          ))}
        </div>
      )}
      <p className="text-small text-ink-muted" aria-live="polite">{shown === 0 ? labels.none : shown == null ? "" : labels.results.replace("{n}", String(shown))}</p>
    </div>
  );
}
