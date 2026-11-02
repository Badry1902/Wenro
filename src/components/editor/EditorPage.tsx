import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { rpc, RpcError } from "@/lib/data/rpc";
import { Badge, Flash, PageTitle, btn } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { makeCover, removePhoto, uploadPhoto } from "@/app/[locale]/app/editor-actions";
import { ExperienceEditor } from "./ExperienceEditor";
import { PhotoUpload } from "./PhotoUpload";
import { MediaUpload } from "./MediaUpload";
import { cloudinaryConfig } from "@/lib/cloudinary";
import { mediaSrc, videoPoster } from "@/lib/media";
import { emptyEditor, type EditorData, type EditorOptions } from "./types";

/** Shared by the operator workspace and the WENRO admin. `base` is the list page path (no locale). */
export async function EditorPage({ locale, base, id, operatorId, ok, err }: {
  locale: string; base: string; id: string | null; operatorId: string | null; ok?: string; err?: string;
}) {
  const t = await getTranslations("app.editor");
  const [options, data] = await Promise.all([
    rpc<EditorOptions>("editor_options", { p_locale: locale }, "user"),
    id ? rpc<EditorData>("experience_editor", { p_experience: id }, "user").catch((e) => {
      if (e instanceof RpcError && (e.code === "forbidden" || e.code === "experience_not_found")) notFound();
      throw e;
    }) : Promise.resolve(emptyEditor(operatorId)),
  ]);
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

      <ExperienceEditor initial={data} options={options} back={`/${locale}${base}`} base={base} />
    </>
  );
}
