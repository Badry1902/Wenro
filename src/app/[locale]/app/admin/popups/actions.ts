"use server";

import { z } from "zod";
import { formLocale } from "@/lib/locale";
import { redirect } from "@/i18n/navigation";
import { rpc, RpcError } from "@/lib/data/rpc";
import { deletePhoto, MAX_PHOTO_BYTES, sniffImage, storePhoto } from "@/lib/storage";

/**
 * Site pop-ups (WENRO dashboard). Every call runs as the signed-in person; the database checks the role
 * (owner, ops, content) and validates everything again.
 */
const LOCALES = ["ar", "en", "de", "ru", "fr"] as const;
const PAGES = ["home", "catalog", "experience", "explore", "plan", "wishlist"] as const;
const id = z.guid();
const v = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const int = (s: string, min: number, max: number, dflt: number) => {
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : dflt;
};

/** "2026-12-01T10:00" typed in Egypt time → ISO timestamp (Egypt uses summer time, so the offset varies). */
function cairoToIso(local: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null;
  const guess = Date.parse(`${local}:00Z`);
  const off = (at: number) => {
    const name = new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Cairo", timeZoneName: "longOffset" })
      .formatToParts(new Date(at)).find((p) => p.type === "timeZoneName")?.value ?? "GMT+02:00";
    const m = /GMT([+-])(\d{2}):?(\d{2})?/.exec(name);
    return m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0)) : 120;
  };
  return new Date(guess - off(guess - off(guess) * 60_000) * 60_000).toISOString();
}

export async function savePopup(form: FormData) {
  const locale = formLocale.parse(form.get("locale"));
  const existing = id.safeParse(form.get("id"));
  const content = Object.fromEntries(LOCALES.map((l) => [l, {
    title: v(form, `title_${l}`).slice(0, 80), body: v(form, `body_${l}`).slice(0, 280), cta: v(form, `cta_${l}`).slice(0, 30),
  }]));
  const pages = PAGES.filter((p) => form.get(`page_${p}`) === "on");
  const langs = LOCALES.filter((l) => form.get(`lang_${l}`) === "on");
  const starts = cairoToIso(v(form, "starts_at"));
  const ends = cairoToIso(v(form, "ends_at"));
  let popupId = existing.success ? existing.data : null;
  let result = "ok=popup_saved";
  try {
    if (starts && ends && ends <= starts) throw new RpcError("invalid_date");
    const saved = await rpc<{ id: string; image_url: string | null }>("save_popup", { p: {
      id: popupId ?? "", name: v(form, "name").slice(0, 80) || v(form, "title_ar") || v(form, "title_en") || "Pop-up",
      layout: z.enum(["card", "modal", "bar"]).catch("card").parse(v(form, "layout")),
      content, cta_url: v(form, "cta_url").slice(0, 500),
      pages: pages.length ? pages : ["home"],
      locales: form.get("all_langs") === "on" || langs.length === 0 || langs.length === LOCALES.length ? null : langs,
      device: z.enum(["all", "mobile", "desktop"]).catch("all").parse(v(form, "device")),
      delay_seconds: int(v(form, "delay_seconds"), 0, 120, 6),
      scroll_percent: int(v(form, "scroll_percent"), 0, 90, 0),
      frequency: z.enum(["once", "weekly", "daily", "session"]).catch("once").parse(v(form, "frequency")),
      starts_at: starts ?? "", ends_at: ends ?? "",
      priority: int(v(form, "priority"), -100, 100, 0),
      show_again: form.get("show_again") === "on",
    } }, "user");
    popupId = saved.id;

    // image: a new file replaces the old one; "remove" clears it
    const file = form.get("image");
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_PHOTO_BYTES) throw new RpcError("photo_too_big");
      const buf = Buffer.from(await file.arrayBuffer());
      const kind = sniffImage(buf);
      if (!kind) throw new RpcError("photo_type");
      const url = await storePhoto(popupId, buf, kind);
      try {
        const r = await rpc<{ old: string | null }>("set_popup_image", { p_popup: popupId, p_url: url }, "user");
        if (r.old) await deletePhoto(r.old);
      } catch (e) { await deletePhoto(url); throw e; }
    } else if (form.get("remove_image") === "on") {
      const r = await rpc<{ old: string | null }>("set_popup_image", { p_popup: popupId, p_url: "" }, "user");
      if (r.old) await deletePhoto(r.old);
    }
    if (form.get("publish") === "1") {
      await rpc("set_popup_status", { p_popup: popupId, p_status: "active" }, "user");
      result = "ok=popup_active";
    }
  } catch (e) {
    result = `err=${e instanceof RpcError ? e.code : "unexpected_error"}`;
    if (!(e instanceof RpcError)) console.error("savePopup", e);
    // stay on the form so nothing typed is lost when it was a new pop-up that never got saved
    if (!popupId) redirect({ href: `/app/admin/popups/new?${result}`, locale });
    redirect({ href: `/app/admin/popups/${popupId}?${result}`, locale });
  }
  redirect({ href: `/app/admin/popups?${result}`, locale });
}

export async function setPopupStatus(form: FormData) {
  const locale = formLocale.parse(form.get("locale"));
  const status = z.enum(["draft", "active", "paused", "archived"]).parse(v(form, "status"));
  let result = `ok=popup_${status}`;
  try {
    await rpc("set_popup_status", { p_popup: id.parse(form.get("id")), p_status: status }, "user");
  } catch (e) {
    result = `err=${e instanceof RpcError ? e.code : "unexpected_error"}`;
  }
  redirect({ href: `/app/admin/popups?${result}`, locale });
}
