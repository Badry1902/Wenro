/**
 * Meeting points from Google Maps links.
 * Operators paste whatever Google Maps gives them ("Share" → short link, or the long address bar link,
 * or plain coordinates). We keep only the coordinates; nothing else from the link is used.
 */
export type LatLng = { lat: number; lng: number };

const GOOGLE_HOST = /^(?:[a-z0-9-]+\.)*(?:google\.[a-z.]{2,8}|goo\.gl)$/i;

function valid(lat: number, lng: number): LatLng | null {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}

/** Coordinates inside a long Google Maps URL, or typed as "27.2246, 33.8411". */
export function parseCoordinates(input: string): LatLng | null {
  const s = decodeURIComponent(input.trim());
  const plain = s.match(/^(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)$/);
  if (plain) return valid(+plain[1], +plain[2]);
  // the place pin itself (more precise than the map centre)
  const pin = [...s.matchAll(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/g)].pop();
  if (pin) return valid(+pin[1], +pin[2]);
  const query = s.match(/[?&](?:q|query|ll|destination|center)=(?:loc:)?(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
  if (query) return valid(+query[1], +query[2]);
  const place = s.match(/\/(?:place|search|dir\/[^/]*)\/(-?\d+\.\d+),\s*\+?(-?\d+\.\d+)/);
  if (place) return valid(+place[1], +place[2]);
  const at = s.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (at) return valid(+at[1], +at[2]);
  return null;
}

/**
 * Server only: follow a short link (maps.app.goo.gl/…) to the full Google Maps address and read the
 * coordinates. Redirects are followed by hand and only to Google hosts, so a pasted link can never make the
 * server call anything else.
 */
export async function resolveMapsLink(input: string): Promise<{ point: LatLng; url: string | null } | null> {
  const direct = parseCoordinates(input);
  if (direct) return { point: direct, url: null };
  let url: URL;
  try { url = new URL(input.trim()); } catch { return null; }
  const original = url.toString();
  for (let hop = 0; hop < 5; hop++) {
    if (url.protocol !== "https:" || !GOOGLE_HOST.test(url.hostname)) return null;
    const found = parseCoordinates(url.toString());
    if (found) return { point: found, url: original };
    let res: Response;
    try {
      res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(5000), headers: { "User-Agent": "Mozilla/5.0 (WENRO meeting point check)" } });
    } catch { return null; }
    const next = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && next) { url = new URL(next, url); continue; }
    // Some pages put the final address in the HTML instead of a redirect
    if (res.ok) {
      const html = (await res.text()).slice(0, 200_000);
      const inPage = parseCoordinates(html.match(/https:\/\/www\.google\.[a-z.]+\/maps[^"'\s<>]+/)?.[0] ?? "");
      return inPage ? { point: inPage, url: original } : null;
    }
    return null;
  }
  return null;
}

/** Link that opens Google Maps (app or site) on the exact point, or around the area. */
export function googleMapsHref(p: LatLng, exact = true) {
  return exact
    ? `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`
    : `https://www.google.com/maps/@${p.lat},${p.lng},14z`;
}

/** OpenStreetMap embed (no cookies, no tracking): a pin for exact points, just the area otherwise. */
export function osmEmbed(p: LatLng, exact = true) {
  const d = exact ? 0.006 : 0.03;
  const bbox = [p.lng - d, p.lat - d * 0.8, p.lng + d, p.lat + d * 0.8].map((n) => n.toFixed(5)).join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik${exact ? `&marker=${p.lat},${p.lng}` : ""}`;
}
