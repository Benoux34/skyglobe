/** Below this width-to-height ratio a picture is a logo or a portrait: it is shown whole. */
const CROPPABLE_ASPECT_RATIO = 1.2;

interface DetailPhotoProps {
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly alt: string;
  /** Who made the picture and where it comes from. */
  readonly credit: string;
  /** The page the picture comes from. */
  readonly href: string;
}

/** Picture at the top of a details panel, linked to its source. */
export function DetailPhoto({ src, width, height, alt, credit, href }: DetailPhotoProps) {
  // Logos are drawn for a white page: on a dark panel a black one would vanish.
  const fit =
    width / height >= CROPPABLE_ASPECT_RATIO ? "object-cover" : "bg-white object-contain p-3";
  return (
    <figure className="border-t border-line">
      <a href={href} target="_blank" rel="noreferrer" className="block bg-inset">
        {/* Served by Wikimedia at the size shown: the Next.js image optimizer would add nothing. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} loading="lazy" className={`aspect-video w-full ${fit}`} />
      </a>
      <figcaption className="truncate px-4 pt-1.5 text-[11px] text-subtle">{credit}</figcaption>
    </figure>
  );
}

/** Holds the place of a picture that is still being looked for. */
export function DetailPhotoPlaceholder() {
  return <div className="aspect-video w-full animate-pulse border-t border-line bg-inset" />;
}

interface DetailSummaryProps {
  readonly text: string;
  readonly href: string;
}

/** A few sentences about the selected object, with a link to the full article. */
export function DetailSummary({ text, href }: DetailSummaryProps) {
  return (
    <p className="px-4 pt-3 text-sm leading-relaxed text-muted">
      <span className="line-clamp-5">{text}</span>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="text-xs text-fg underline underline-offset-2"
      >
        Read on Wikipedia
      </a>
    </p>
  );
}
