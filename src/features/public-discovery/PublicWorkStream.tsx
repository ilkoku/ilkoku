import Link from "next/link";

import { publicTaxonomySlug } from "@/lib/public-taxonomy";

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

export function PublicWorkStream({
  dateMode = "published",
  works,
}: {
  dateMode?: "published" | "updated";
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

        return (
          <article
            className="public-hub-card"
            key={work.slug}
          >
            <div className="public-hub-card__meta">
              {genre ? (
                <Link
                  href={`/turler/${publicTaxonomySlug(
                    genre,
                  )}`}
                >
                  {genre}
                </Link>
              ) : (
                <span>Tür belirtilmedi</span>
              )}
              <span>
                {work._count.chapters} bölüm
              </span>
            </div>

            <h2>
              <Link
                href={`/kitap/${work.slug}?from=/eserler`}
              >
                {work.title}
              </Link>
            </h2>
            <p className="public-hub-card__author">
              <Link href={`/yazarlar/${work.author.publicId}`}>
                {authorName}
              </Link>
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
              <Link
                href={`/kitap/${work.slug}?from=/eserler`}
              >
                Eseri incele →
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}
