import { readingContent } from "@/content";

interface BookCoverProps {
  compact?: boolean;
  coverUrl?: string | null;
  title: string;
  variant?: "hero" | "one" | "two" | "three";
}

export function BookCover({
  compact = false,
  coverUrl,
  title,
  variant = "hero",
}: BookCoverProps) {
  return (
    <div
      className={`showcase-cover showcase-cover--${variant}${compact ? " showcase-cover--compact" : ""}${coverUrl ? " showcase-cover--image" : ""}`}
      role="img"
      aria-label={readingContent.common.bookCover(title)}
    >
      {coverUrl ? (
        // Cover URLs are intentionally provider-agnostic; forcing next/image here
        // would require trusting/configuring arbitrary remote hosts and could break
        // existing reader-visible covers.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="showcase-cover__image"
          src={coverUrl}
          alt={`${title} kapak görseli`}
        />
      ) : (
        <>
          <span className="showcase-cover__star" aria-hidden="true">✦</span>
          <div className="showcase-cover__horizon" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <div className="showcase-cover__copy">
            <small>{readingContent.showcase.originalWork}</small>
            <strong>{title}</strong>
            <span>{readingContent.showcase.novelBy}</span>
          </div>
        </>
      )}
    </div>
  );
}
