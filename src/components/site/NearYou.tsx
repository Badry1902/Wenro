"use client";

import { useTranslations } from "next-intl";
import type { ExperienceCard } from "@/lib/data/types";
import { distanceTo } from "@/lib/places";
import { IconPin } from "../Icons";
import { openCityPicker, useCity } from "./CityPicker";
import { Rail, RailItem } from "./Rail";
import { TripCard } from "./TripCard";

/** Home: trips in or near the city the guest stays in; without a city, an invitation to pick one. */
export function NearYou({ cards }: { cards: ExperienceCard[] }) {
  const t = useTranslations();
  const [city] = useCity();
  if (!city) {
    return (
      <section className="pop-in mt-14 flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-line bg-surface p-6 md:p-8">
        <div>
          <h2 className="text-[24px] font-extrabold leading-tight md:text-[28px]">{t("places.pick")}</h2>
          <p className="mt-1 text-ink-muted">{t("places.pickSub")}</p>
        </div>
        <button type="button" onClick={openCityPicker} className="btn-press inline-flex min-h-12 items-center gap-2 rounded-full bg-discovery px-6 font-bold text-white hover:bg-discovery-hover">
          <IconPin size={18} />{t("places.choose")}
        </button>
      </section>
    );
  }
  const name = t(`places.city.${city.slug}` as "places.city.hurghada");
  const list = cards.map((c) => ({ c, d: distanceTo(city, c) })).filter((x) => x.d != null && x.d <= 90).sort((a, b) => a.d! - b.d!).map((x) => x.c);
  return (
    <section className="pop-in mt-14">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[26px] font-extrabold leading-tight md:text-[32px]">{t("places.nearYou", { city: name })}</h2>
          <p className="mt-1 text-ink-muted">{list.length ? t("places.nearYouSub", { city: name }) : t("places.noneNear", { city: name })}</p>
        </div>
        <button type="button" onClick={openCityPicker} className="btn-press inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line px-4 text-small font-bold hover:border-discovery">
          <IconPin size={16} className="text-apricot" />{t("places.change")}
        </button>
      </div>
      {list.length > 0 && (
        <Rail labels={{ prev: t("home.prev"), next: t("home.next") }}>
          {list.slice(0, 12).map((c) => <RailItem key={c.id}><TripCard c={c} size="sm" city={city} /></RailItem>)}
        </Rail>
      )}
    </section>
  );
}
