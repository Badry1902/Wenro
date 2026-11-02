/**
 * Three panels shaped like the W logo's folded map. The outer panels lean in,
 * the middle one stands straight. Without photos each panel shows a calm placeholder.
 */
export function FoldGallery({
  images,
  placeholder,
  compact = false,
}: {
  images: { src: string; alt: string }[];
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
        const img = images[i];
        return (
          <div key={i} className={`relative overflow-hidden rounded-image ${tints[i]} ${shapes[i]}`}>
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img.src} alt={img.alt} className="h-full w-full object-cover" />
            ) : i === 1 ? (
              <span className="absolute inset-x-0 bottom-3 text-center text-small font-semibold text-ink">{placeholder}</span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
