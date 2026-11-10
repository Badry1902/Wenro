"use client";

import dynamic from "next/dynamic";
import type { ExperienceCard } from "@/lib/data/types";

// Leaflet needs the browser (window), so the map loads on the client only.
const ExploreMap = dynamic(() => import("./ExploreMap").then((m) => m.ExploreMap), {
  ssr: false, loading: () => <div className="h-full animate-pulse bg-aqua-tint" />,
});

export function ExploreMapLoader(props: { cards: ExperienceCard[]; categories: { slug: string; name: string }[] }) {
  return <ExploreMap {...props} />;
}
