"use client";

import { IconCalendar } from "@/components/Icons";

/** Adds the trip's start to the guest's calendar (.ics works with Apple, Google, Outlook), with a reminder. */
export function CalendarButton({ label, title, start, location, reference, url }: { label: string; title: string; start: string; location: string; reference: string; url: string }) {
  const save = () => {
    const d = (x: Date) => x.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (m) => `\\${m}`);
    const from = new Date(start);
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//WENRO//Booking//EN", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
      `UID:${reference}@wenro`, `DTSTAMP:${d(new Date())}`, `DTSTART:${d(from)}`, `DTEND:${d(new Date(from.getTime() + 60 * 60_000))}`,
      `SUMMARY:${esc(`${title} (${reference})`)}`, `LOCATION:${esc(location)}`, `DESCRIPTION:${esc(`WENRO ${reference}\n${url}`)}`,
      "BEGIN:VALARM", "TRIGGER:-PT12H", "ACTION:DISPLAY", `DESCRIPTION:${esc(title)}`, "END:VALARM",
      "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    a.download = `wenro-${reference}.ics`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  return (
    <button type="button" onClick={save}
      className="btn-press flex min-h-12 items-center justify-center gap-2 rounded-control border border-line bg-surface font-bold hover:border-discovery hover:text-discovery">
      <IconCalendar size={18} />{label}
    </button>
  );
}
