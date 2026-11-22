import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { rpc } from "@/lib/data/rpc";
import { requirePlatform } from "@/lib/workspaces";
import { Flash, PageTitle } from "@/components/ui";
import { PopupEditor, type EditorValues } from "@/components/admin/PopupEditor";
import { savePopup } from "../actions";

export const dynamic = "force-dynamic";

type Row = EditorValues & { status: string };

/** ISO → "YYYY-MM-DDTHH:mm" in Egypt time, for <input type="datetime-local"> */
function cairoLocal(iso: string | null) {
  if (!iso) return "";
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

export default async function PopupEdit({ params, searchParams }: { params: Promise<{ locale: string; id: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const q = await searchParams;
  await requirePlatform(locale, "popups");
  const t = await getTranslations("app.popups");
  const tp = await getTranslations("popup");

  let initial: EditorValues;
  if (id === "new") {
    initial = {
      id: null, name: "", layout: "card", content: {}, image_url: null, cta_url: "", pages: ["home", "catalog"], locales: null,
      device: "all", delay_seconds: 6, scroll_percent: 25, frequency: "once", starts_at: "", ends_at: "", priority: 0, status: "draft",
    };
  } else {
    if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
    const row = (await rpc<Row[]>("admin_popups", {}, "user")).find((r) => r.id === id);
    if (!row || row.status === "archived") notFound();
    initial = { ...row, cta_url: row.cta_url ?? "", starts_at: cairoLocal(row.starts_at), ends_at: cairoLocal(row.ends_at) };
  }

  const L = ["ar", "en", "de", "ru", "fr"] as const;
  const P = ["home", "catalog", "experience", "explore", "plan", "wishlist"] as const;
  const labels = {
    sections: { content: t("sections.content"), look: t("sections.look"), where: t("sections.where"), when: t("sections.when"), schedule: t("sections.schedule"), preview: t("sections.preview") },
    name: t("name"), nameHint: t("nameHint"), contentHint: t("contentHint"),
    lang: Object.fromEntries(L.map((l) => [l, t(`lang.${l}`)])) as Record<(typeof L)[number], string>,
    fTitle: t("fTitle"), fBody: t("fBody"), fCta: t("fCta"), link: t("link"), linkHint: t("linkHint"),
    image: t("image"), imageHint: t("imageHint"), removeImage: t("removeImage"),
    layout: { card: t("layout.card"), modal: t("layout.modal"), bar: t("layout.bar") },
    layoutHint: { card: t("layoutHint.card"), modal: t("layoutHint.modal"), bar: t("layoutHint.bar") },
    pages: t("pages"), page: Object.fromEntries(P.map((p) => [p, t(`page.${p}`)])) as Record<(typeof P)[number], string>,
    languages: t("languages"), allLanguages: t("allLanguages"),
    device: t("device"), deviceOpt: { all: t("deviceOpt.all"), mobile: t("deviceOpt.mobile"), desktop: t("deviceOpt.desktop") },
    delay: t("delay"), scroll: t("scroll"), scrollVal: t.raw("scrollVal") as string, scrollNone: t("scrollNone"),
    frequency: t("frequency"), freq: { once: t("freq.once"), weekly: t("freq.weekly"), daily: t("freq.daily"), session: t("freq.session") },
    startsAt: t("startsAt"), endsAt: t("endsAt"), scheduleHint: t("scheduleHint"), priority: t("priority"), priorityHint: t("priorityHint"),
    showAgain: t("showAgain"), saveDraft: t("saveDraft"), savePublish: t("savePublish"), save: t("save"), cancel: t("cancel"),
    previewMobile: t("previewMobile"), previewDesktop: t("previewDesktop"), previewLang: t("previewLang"), previewEmpty: t("previewEmpty"),
    close: tp("close"), sponsored: tp("sponsored"),
  };

  return (
    <>
      <PageTitle title={id === "new" ? t("new") : t("edit")} />
      <Flash ok={q.ok} err={q.err} />
      <PopupEditor initial={initial} labels={labels} locale={locale} action={savePopup} />
    </>
  );
}
