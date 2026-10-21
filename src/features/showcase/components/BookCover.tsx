import Image from "next/image";

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
  // Accept only First-Party UUID CMS assets for optimization. External authors'
  // cover URLs deliberately retain the legacy browser <img> path.
  const firstPartyMediaPath = coverUrl?.match(
    /^(?:https:\/\/(?:www\.)?ilkoku\.com)?(\/api\/media\/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12})(?:\?.*)?$/iu,
  )?.[1] ?? null;
  return (
    <div
      className={`showcase-cover showcase-cover--${variant}${compact ? " showcase-cover--compact" : ""}${coverUrl ? " showcase-cover--image" : ""}`}
      role="img"
      aria-label={readingContent.common.bookCover(title)}
    >
      {coverUrl ? (
        firstPartyMediaPath ? (
          <Image
            className="showcase-cover__image"
            src={firstPartyMediaPath}
            alt={`${title} kapak görseli`}
            width={1024}
            height={1536}
            sizes={compact ? "(max-width: 640px) 38vw, 180px" : "(max-width: 640px) 80vw, (max-width: 1200px) 35vw, 520px"}
          />
        ) : (
          // Keep arbitrary remote image URLs untouched; the optimizer is for
          // our own CMS media only, and remote domains are not allowlisted.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="showcase-cover__image"
            src={coverUrl}
            alt={`${title} kapak görseli`}
          />
        )
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
