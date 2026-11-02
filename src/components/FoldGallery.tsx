import { mediaSrc, videoPoster } from "@/lib/media";
import { VideoTile } from "./VideoTile";

/**
 * Three panels shaped like the W logo's folded map. The outer panels lean in,
 * the middle one stands straight. Without photos each panel shows a calm placeholder.
 */
export function FoldGallery({
  images,
  placeholder,
  compact = false,
}: {
  images: { src: string; alt: string; kind?: "image" | "video" }[];
  placeholder: string;
  compact?: boolean;
}) {
  const tints = ["bg-[#CBD3F7]", "bg-[#F9C9AE]", "bg-[#CBD3F7]"];
  const shapes = [
    "[clip-path:polygon(0_6%,100%_0,100%_100%,0_94%)] rtl:[clip-path:polygon(0_0,100%_6%,100%_94%,0_100%)]",
    "",
    "[clip-path:polygon(0_0,100%_6%,100%_94%,0_100%)] rtl:[clip-path:polygon(0_6%,100%_0,100%_100%,0_94%)]",
  ];
  return (
    <div className={`grid grid-cols-[1fr_1.25fr_1fr] gap-2 ${compact ? "h-56" : "h-64 md:h-96"}`}>
      {[0, 1, 2].map((i) => {
        const img = images[[1, 0, 2][i]]; // the cover photo takes the large middle panel
        return (
          <div key={i} data-side={["start", "mid", "end"][i]} className={`fold-panel relative overflow-hidden rounded-image ${tints[i]} ${shapes[i]}`}>
            {img ? (img.kind === "video" ? (
              <VideoTile src={mediaSrc(img.src, { w: 960, h: 768 })} poster={videoPoster(img.src, { w: 960, h: 768 })} label={img.alt} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaSrc(img.src, { w: i === 1 ? 960 : 720, h: 768 })} alt={img.alt} className="h-full w-full object-cover" />
            )) : i === 1 ? (
              <span className="absolute inset-x-0 bottom-3 text-center text-small font-semibold text-ink">{placeholder}</span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
