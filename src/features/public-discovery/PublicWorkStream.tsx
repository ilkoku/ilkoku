import Link from "next/link";
import { safeOneHopReturnPath } from "@/lib/one-hop-return-path.mjs";

import { normalizeGenreLabel } from "@/lib/genre-system";
import { publicTaxonomySlug } from "@/lib/public-taxonomy";
import {
  workContentRatingDetails,
  type StoredWorkContentRating,
} from "@/lib/work-content-classification";

type PublicWorkStreamItem = {
  _count: {
    chapters: number;
  };
  author: {
    displayName: string | null;
    fullName: string;
    publicId: string;
  };
  description: string | null;
  contentRating: StoredWorkContentRating;
  genre: string | null;
  publishedAt: Date | null;
  slug: string;
  title: string;
  updatedAt: Date;
};

function formatDate(value: Date | null) {
  if (!value) return "Tarih belirtilmedi";

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
  }).format(value);
}

function summary(value: string | null) {
  const normalized =
    value?.replace(/\s+/gu, " ").trim() ||
    "Yazar bu eser için henüz bir tanıtım metni eklemedi.";

  return normalized.length > 180
    ? `${normalized.slice(0, 177).trimEnd()}...`
    : normalized;
}

function withReturnPath(path: string, returnPath: string) {
  const oneHopReturnPath = safeOneHopReturnPath(returnPath, "/eserler");
  return `${path}?from=${encodeURIComponent(oneHopReturnPath)}`;
}

export function PublicWorkStream({
  dateMode = "published",
  returnPath = "/eserler",
  works,
}: {
  dateMode?: "published" | "updated";
  returnPath?: string;
  works: readonly PublicWorkStreamItem[];
}) {
  return (
    <div className="public-hub__grid">
      {works.map((work) => {
        const authorName =
          work.author.displayName ??
          work.author.fullName;
        const genre = work.genre?.trim();
        const displayedDate =
          dateMode === "updated"
            ? work.updatedAt
            : work.publishedAt;
        const bookHref = withReturnPath(
          `/kitap/${work.slug}`,
          returnPath,
        );
        const passportHref = withReturnPath(
          `/kitap/${work.slug}/pasaport`,
          returnPath,
        );
        const authorHref = withReturnPath(
          `/yazarlar/${work.author.publicId}`,
          returnPath,
        );
        // Legacy work genres can fall outside the current public taxonomy.
        // Display their original name, but never link to a guaranteed 404.
        const supportedGenre = normalizeGenreLabel(genre);
        const genreHref = supportedGenre
          ? withReturnPath(
              `/turler/${publicTaxonomySlug(supportedGenre)}`,
              returnPath,
            )
          : null;

        return (
          <article
            className="public-hub-card"
            key={work.slug}
          >
            <div className="public-hub-card__meta">
              {genre && genreHref ? (
                <Link prefetch={false} href={genreHref}>{genre}</Link>
              ) : (
                <span>{genre || "Tür belirtilmedi"}</span>
              )}
              <span>
                {work._count.chapters} bölüm
              </span>
              <span>
                {workContentRatingDetails[work.contentRating].shortLabel}
              </span>
            </div>

            <h2>
              <Link prefetch={false} href={bookHref}>{work.title}</Link>
            </h2>
            <p className="public-hub-card__author">
              <Link prefetch={false} href={authorHref}>{authorName}</Link>
            </p>
            <p className="public-hub-card__description">
              {summary(work.description)}
            </p>

            <div className="public-hub-card__footer">
              <time
                dateTime={displayedDate?.toISOString()}
              >
                {dateMode === "updated"
                  ? "Güncellendi: "
                  : "Yayımlandı: "}
                {formatDate(displayedDate)}
              </time>
              <Link prefetch={false} href={passportHref}>
                Pasaport →
              </Link>
              <Link prefetch={false} href={bookHref}>
                Eseri incele →
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}
