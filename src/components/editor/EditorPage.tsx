import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { rpc, RpcError } from "@/lib/data/rpc";
import { Badge, Flash, PageTitle, btn, field } from "@/components/ui";
import { Submit } from "@/components/Submit";
import { MeetingMap } from "@/components/site/MeetingMap";
import { Link } from "@/i18n/navigation";
import { makeCover, removePhoto, saveLocation, savePlace, saveTheme, uploadPhoto } from "@/app/[locale]/app/editor-actions";
import { CITIES, GOVERNORATES, km } from "@/lib/places";
import { THEMES, patternStyle, themeFor } from "@/lib/themes";
import { ThemeMotif } from "@/components/brand/ThemeArt";
import { ExperienceEditor } from "./ExperienceEditor";
import { PhotoUpload } from "./PhotoUpload";
import { MediaUpload } from "./MediaUpload";
import { cloudinaryConfig } from "@/lib/cloudinary";
import { mediaSrc, videoPoster } from "@/lib/media";
import { emptyEditor, type EditorData, type EditorOptions } from "./types";

type Loc = { lat: number | null; lng: number | null; place: string | null; exact_public: boolean; url: string | null;
  city?: string | null; activity?: { lat: number; lng: number; place: string | null; url: string | null } | null };

/** Shared by the operator workspace and the WENRO admin. `base` is the list page path (no locale). */
export async function EditorPage({ locale, base, id, operatorId, ok, err }: {
  locale: string; base: string; id: string | null; operatorId: string | null; ok?: string; err?: string;
}) {
  const t = await getTranslations("app.editor");
  const tt = await getTranslations();
  const [options, data, location] = await Promise.all([
    rpc<EditorOptions>("editor_options", { p_locale: locale }, "user"),
    id ? rpc<EditorData>("experience_editor", { p_experience: id }, "user").catch((e) => {
      if (e instanceof RpcError && (e.code === "forbidden" || e.code === "experience_not_found")) notFound();
      throw e;
    }) : Promise.resolve(emptyEditor(operatorId)),
    id ? rpc<Loc | null>("experience_location", { p_experience: id }, "user").catch(() => null) : Promise.resolve(null),
  ]);
  const meet = location && location.lat != null && location.lng != null ? { lat: location.lat, lng: location.lng } : null;
  const act = location?.activity ?? null;
  const cityName = (slug: string) => tt(`places.city.${slug}` as "places.city.hurghada");
  const chosenTheme = id ? await rpc<string | null>("experience_theme", { p_experience: id }, "user").catch(() => null) : null;
  const autoTheme = themeFor({ category: options.categories.find((c) => c.id === data.category_id)?.slug, slug: data.slug, title: data.translations.en?.title });
  const cloud = !!cloudinaryConfig();
  const hidden = (<><input type="hidden" name="locale" value={locale} /><input type="hidden" name="base" value={base} /><input type="hidden" name="experience" value={id ?? ""} /></>);

  return (
    <>
      <PageTitle
        title={id ? (data.translations.en?.title || t("untitled")) : t("newTitle")}
        sub={id ? `${data.operator ?? ""}` : t("newSub")}
        actions={id ? <div className="flex items-center gap-2"><Badge value={data.status ?? "draft"} />
          {data.status === "published" && <Link href={`/experiences/${data.slug}`} className={btn.quiet}>{t("viewLive")}</Link>}</div> : undefined}
      />
      <Flash ok={ok} err={err} />
      {data.status === "published" && <p className="mb-6 rounded-card bg-warning-tint p-3 text-small text-warning">{t("liveWarning")}</p>}

      {id && (
        <section id="photos" aria-labelledby="ed-photos" className="mb-10 flex flex-col gap-4">
          <h2 id="ed-photos" className="text-h3 font-bold">{t("photos")}</h2>
          {data.media.length > 0 && (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {data.media.map((m, i) => (
                <li key={m.id} className="overflow-hidden rounded-card border border-line">
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.kind === "video" ? (videoPoster(m.path, { w: 480, h: 360 }) ?? "") : mediaSrc(m.path, { w: 480, h: 360 })} alt={m.alt ?? ""} className="aspect-[4/3] w-full bg-ink object-cover" />
                    {m.kind === "video" && <span className="absolute start-2 top-2 rounded-full bg-ink/85 px-2 py-0.5 text-[11px] font-bold text-white">▶ {t("video")}</span>}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2">
                    {i === 0 ? <span className="text-small font-bold text-success">{t("cover")}</span> : (
                      <form action={makeCover}>{hidden}<input type="hidden" name="media" value={m.id} /><button className="btn-press min-h-9 rounded-control px-2 text-small font-semibold text-discovery">{t("makeCover")}</button></form>
                    )}
                    <form action={removePhoto}>{hidden}<input type="hidden" name="media" value={m.id} /><button className="btn-press min-h-9 rounded-control px-2 text-small font-semibold text-critical">{t("remove")}</button></form>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {cloud ? (
            <div className="rounded-card border border-dashed border-line p-4">
              <MediaUpload experienceId={id} labels={{
                choose: t("chooseMedia"), alt: t("photoAlt"), upload: t("upload"), uploading: t("uploading"), saving: t("savingMedia"),
                done: t("mediaAdded"), hint: t("mediaHint"), tooBigImage: t("errors.image_too_big"), tooBigVideo: t("errors.video_too_big"),
                errors: Object.fromEntries(["unexpected_error", "photo_type", "upload_failed", "upload_not_verified", "too_many_photos", "too_many_videos", "forbidden"].map((k) => [k, t(`errors.${k}`)])),
              }} />
            </div>
          ) : (
            <form action={uploadPhoto} className="rounded-card border border-dashed border-line p-4">
              {hidden}
              <PhotoUpload labels={{ choose: t("choosePhoto"), alt: t("photoAlt"), upload: t("upload"), uploading: t("uploading"), hint: t("photoHint"), tooBig: t("errors.photo_too_big") }} />
            </form>
          )}
        </section>
      )}

      {id && (
        <section id="place" aria-labelledby="ed-place" className="mb-10 flex flex-col gap-4">
          <h2 id="ed-place" className="text-h3 font-bold">{tt("app.editorPlace.title")}</h2>
          <p className="text-small text-ink-muted">{tt("app.editorPlace.hint")}</p>
          {act && (
            <div className="grid gap-3 md:grid-cols-[1fr_1.2fr]">
              <MeetingMap point={{ lat: act.lat, lng: act.lng }} exact label={act.place ?? tt("app.editorPlace.activity")} openLabel={t("locationOpen")} />
              <div className="flex flex-col gap-1 text-small">
                <span><b>{act.place ?? "—"}</b></span>
                <span dir="ltr" className="text-ink-muted">{act.lat}, {act.lng}</span>
                {meet && <span>{tt("app.editorPlace.fromMeeting", { km: Math.round(km(meet.lat, meet.lng, act.lat, act.lng)) })}</span>}
              </div>
            </div>
          )}
          <form action={savePlace} className="flex flex-col gap-3 rounded-card border border-line p-4">
            {hidden}
            <label className="flex flex-col gap-1 text-small font-bold">{tt("app.editorPlace.city")}
              <select name="city" defaultValue={location?.city ?? ""} required className={field}>
                <option value="" disabled>{tt("app.editorPlace.cityPick")}</option>
                {GOVERNORATES.map((g) => (
                  <optgroup key={g} label={tt(`places.gov.${g}` as "places.gov.redsea")}>
                    {CITIES.filter((c) => c.gov === g).map((c) => <option key={c.slug} value={c.slug}>{cityName(c.slug)}</option>)}
                  </optgroup>
                ))}
              </select>
              <span className="font-normal text-ink-muted">{tt("app.editorPlace.cityHint")}</span>
            </label>
            <label className="flex flex-col gap-1 text-small font-bold">{tt("app.editorPlace.activityLink")}
              <input name="maps" defaultValue="" placeholder="https://maps.app.goo.gl/…" dir="ltr" inputMode="url" className={field} />
              <span className="font-normal text-ink-muted">{tt("app.editorPlace.activityLinkHint")}</span>
            </label>
            <label className="flex flex-col gap-1 text-small font-bold">{tt("app.editorPlace.activityPlace")}
              <input name="place" defaultValue={act?.place ?? ""} maxLength={120} placeholder={tt("app.editorPlace.activityPlaceExample")} className={field} />
            </label>
            {act && (
              <label className="flex items-center gap-2 text-small">
                <input type="checkbox" name="clear_activity" value="1" className="size-4" />{tt("app.editorPlace.clearActivity")}
              </label>
            )}
            <div className="flex flex-wrap gap-2"><Submit className={btn.primary}>{tt("app.editorPlace.save")}</Submit></div>
          </form>
        </section>
      )}

      {id && (
        <section id="location" aria-labelledby="ed-location" className="mb-10 flex flex-col gap-4">
          <h2 id="ed-location" className="text-h3 font-bold">{t("location")}</h2>
          <p className="text-small text-ink-muted">{t("locationHint")}</p>
          {location && meet && (
            <div className="grid gap-3 md:grid-cols-[1fr_1.2fr]">
              <MeetingMap point={meet} exact label={location.place ?? t("location")} openLabel={t("locationOpen")} />
              <div className="flex flex-col gap-1 text-small">
                <span><b>{location.place ?? "—"}</b></span>
                <span dir="ltr" className="text-ink-muted">{meet.lat}, {meet.lng}</span>
                <span className={location.exact_public ? "text-success" : "text-warning"}>{location.exact_public ? t("locationPublic") : t("locationPrivate")}</span>
              </div>
            </div>
          )}
          <form action={saveLocation} className="flex flex-col gap-3 rounded-card border border-line p-4">
            {hidden}
            <label className="flex flex-col gap-1 text-small font-bold">{t("locationLink")}
              <input name="maps" required={!meet} defaultValue="" placeholder="https://maps.app.goo.gl/…" dir="ltr" inputMode="url" className={field} />
              <span className="font-normal text-ink-muted">{t("locationLinkHint")}</span>
            </label>
            <label className="flex flex-col gap-1 text-small font-bold">{t("locationPlace")}
              <input name="place" defaultValue={location?.place ?? ""} maxLength={120} className={field} />
              <span className="font-normal text-ink-muted">{t("locationPlaceHint")}</span>
            </label>
            <label className="flex items-start gap-2 text-small">
              <input type="checkbox" name="exact" value="1" defaultChecked={location?.exact_public ?? true} className="mt-1 size-4" />
              <span><b>{t("locationExact")}</b><br /><span className="text-ink-muted">{t("locationExactHint")}</span></span>
            </label>
            <div className="flex flex-wrap gap-2">
              <Submit className={btn.primary}>{t("locationSave")}</Submit>
            </div>
          </form>
          {meet && (
            <form action={saveLocation}>{hidden}<input type="hidden" name="clear" value="1" /><Submit className={btn.quiet}>{t("locationClear")}</Submit></form>
          )}
        </section>
      )}

      {id && (
        <section id="design" aria-labelledby="ed-design" className="mb-10 flex flex-col gap-4">
          <h2 id="ed-design" className="text-h3 font-bold">{tt("app.editorTheme.title")}</h2>
          <p className="text-small text-ink-muted">{tt("app.editorTheme.hint")}</p>
          <form action={saveTheme} className="flex flex-col gap-3">
            {hidden}
            <fieldset className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <legend className="sr-only">{tt("app.editorTheme.title")}</legend>
              {(["", ...THEMES] as const).map((th) => {
                const shown = th || autoTheme;
                return (
                  <label key={th || "auto"} className="group cursor-pointer overflow-hidden rounded-card border-2 border-line bg-surface has-[:checked]:border-discovery has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-discovery">
                    <input type="radio" name="theme" value={th} defaultChecked={(chosenTheme ?? "") === th} className="sr-only" />
                    <span className="relative block h-20" style={patternStyle(shown, "feature", 200)} aria-hidden="true">
                      <span className="absolute bottom-2 start-2 grid size-10 place-items-center rounded-xl bg-white"><ThemeMotif theme={shown} size={26} /></span>
                    </span>
                    <span className="flex items-center justify-between gap-2 p-3 text-small font-bold">
                      {th ? tt(`themes.${th}.name`) : tt("app.editorTheme.auto", { name: tt(`themes.${autoTheme}.name`) })}
                      <span className="size-4 shrink-0 rounded-full border-2 border-line group-has-[:checked]:border-[5px] group-has-[:checked]:border-discovery" aria-hidden="true" />
                    </span>
                  </label>
                );
              })}
            </fieldset>
            <div><Submit className={btn.primary}>{tt("app.editorTheme.save")}</Submit></div>
          </form>
        </section>
      )}

      <ExperienceEditor initial={data} options={options} back={`/${locale}${base}`} base={base} />
    </>
  );
}
