import { googleMapsHref, osmEmbed, type LatLng } from "@/lib/maps";
import { IconPin } from "../Icons";

/**
 * A small map window. The map itself is OpenStreetMap (no cookies or tracking for visitors); the whole card is
 * a link that opens Google Maps on the exact point (the app on phones), or around the area when the operator
 * keeps the exact pin for booked guests.
 */
export function MeetingMap({ point, exact, label, openLabel, note, className = "" }: {
  point: LatLng; exact: boolean; label: string; openLabel: string; note?: string; className?: string;
}) {
  return (
    <a href={googleMapsHref(point, exact)} target="_blank" rel="noopener noreferrer"
      className={`group relative block overflow-hidden rounded-card border border-line bg-discovery-tint ${className}`} aria-label={`${openLabel}: ${label}`}>
      <iframe src={osmEmbed(point, exact)} title={label} loading="lazy" tabIndex={-1} aria-hidden="true"
        className="pointer-events-none block h-52 w-full border-0 md:h-60" referrerPolicy="no-referrer" />
      {!exact && <span className="pointer-events-none absolute left-1/2 top-[45%] size-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-discovery bg-discovery/15" aria-hidden="true" />}
      <span className="flex items-center justify-between gap-3 bg-surface px-4 py-3">
        <span className="flex min-w-0 items-center gap-2">
          <IconPin size={20} className="shrink-0 text-discovery" />
          <span className="min-w-0"><b className="block truncate">{label}</b>{note && <span className="block text-small text-ink-muted">{note}</span>}</span>
        </span>
        <span className="shrink-0 rounded-full bg-discovery px-3 py-1.5 text-small font-bold text-white transition-colors group-hover:bg-discovery-hover">{openLabel}</span>
      </span>
    </a>
  );
}
