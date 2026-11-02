import type { MetadataRoute } from "next";

/** Lets guests and partners add WENRO to their phone's home screen (opens like an app). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WENRO — Hurghada experiences",
    short_name: "WENRO",
    description: "Book trips and local experiences around Hurghada and the Red Sea.",
    start_url: "/ar",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#3046d9",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
