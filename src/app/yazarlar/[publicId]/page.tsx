import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getPublicAuthorById,
} from "@/features/public-discovery/library";
import { PublicHubShell } from "@/features/public-discovery/PublicHubShell";
import { publicTaxonomySlug } from "@/lib/public-taxonomy";
import { workContentRatingDetails } from "@/lib/work-content-classification";

const baseUrl = "https://ilkoku.com";

type AuthorPageProps = {
  params: Promise<{
    publicId: string;
  }>;
  searchParams: Promise<{
    from?: string;
  }>;
};

function authorName(author: {
  displayName: string | null;
  fullName: string;
}) {
  return author.displayName ?? author.fullName;
}

function description(value: string | null) {
  const normalized =
    value?.replace(/\s+/gu, " ").trim() ||
    "Yazar bu eser için henüz bir tanıtım metni eklemedi.";

  return normalized.length > 190
    ? `${normalized.slice(0, 187).trimEnd()}...`
    : normalized;
}

function safeReturnPath(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/yazarlar";
  }

  return value;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
  searchParams,
}: AuthorPageProps): Promise<Metadata> {
  const [{ publicId }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  const author = await getPublicAuthorById(publicId);

  if (!author) {
    return {
      title: "Yazar bulunamadı | İlkOku",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const name = authorName(author);
  const canonical = `/yazarlar/${author.publicId}`;
  const metaDescription =
    `${name} tarafından İlkOku’da herkese açık yayımlanan ${author.works.length} Türkçe eseri keşfedin.`;

  return {
    title: `${name} — Eserleri | İlkOku`,
    description: metaDescription,
    alternates: {
      canonical,
    },
    robots: {
      index: !query.from,
      follow: true,
    },
    openGraph: {
      type: "profile",
      locale: "tr_TR",
      url: canonical,
      title: `${name} — Eserleri | İlkOku`,
      description: metaDescription,
    },
  };
}

export default async function PublicAuthorPage({
  params,
  searchParams,
}: AuthorPageProps) {
  const [{ publicId }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  const author = await getPublicAuthorById(publicId);

  if (!author) {
    notFound();
  }

  const name = authorName(author);
  const profilePath = `/yazarlar/${author.publicId}`;
  const returnTo = safeReturnPath(query.from);
  const canonical = `${baseUrl}${profilePath}`;
  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      name: `${name} — İlkOku yazar vitrini`,
      url: canonical,
      inLanguage: "tr-TR",
      mainEntity: {
        "@type": "Person",
        name,
        url: canonical,
        workExample: author.works.map((work) => ({
          "@type": "Book",
          name: work.title,
          url: `${baseUrl}/kitap/${work.slug}`,
          genre: work.genre ?? undefined,
          datePublished:
            work.publishedAt?.toISOString(),
        })),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Ana Sayfa",
          item: `${baseUrl}/`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Yazarlar",
          item: `${baseUrl}/yazarlar`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name,
          item: canonical,
        },
      ],
    },
  ];

  return (
    <PublicHubShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schemas).replace(
            /</g,
            "\\u003c",
          ),
        }}
      />

      <main className="public-hub__container">
        <header className="public-hub__hero">
          <p className="public-hub__eyebrow">
            YAZAR VİTRİNİ
          </p>
          <h1>{name}</h1>
          <p>
            Bu vitrinde yalnız yazarın herkese açık
            yayımladığı Türkçe eserler bulunur. Taslaklar,
            özel çalışmalar ve kişisel hesap bilgileri
            gösterilmez.
          </p>
          <p>
            <Link href={returnTo}>← Geldiğin keşfe dön</Link>
          </p>
        </header>

        <section
          aria-labelledby="yazar-eserleri"
          className="public-hub__section"
        >
          <div className="public-hub__section-heading">
            <h2 id="yazar-eserleri">
              Yayımlanan eserler
            </h2>
            <span>{author.works.length} eser</span>
          </div>

          <div className="public-hub__grid">
            {author.works.map((work) => {
              const genre = work.genre?.trim();
              const bookHref = `/kitap/${work.slug}?from=${encodeURIComponent(profilePath)}`;

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
                        )}?from=${encodeURIComponent(profilePath)}`}
                      >
                        {genre}
                      </Link>
                    ) : (
                      <span>Tür belirtilmedi</span>
                    )}
                    <span>
                      {work._count.chapters} bölüm
                    </span>
                    <span>
                      {workContentRatingDetails[work.contentRating].shortLabel}
                    </span>
                  </div>
                  <h2>
                    <Link href={bookHref}>
                      {work.title}
                    </Link>
                  </h2>
                  <p className="public-hub-card__description">
                    {description(work.description)}
                  </p>
                  <div className="public-hub-card__footer">
                    <time
                      dateTime={
                        work.publishedAt?.toISOString()
                      }
                    >
                      {work.publishedAt
                        ? new Intl.DateTimeFormat(
                            "tr-TR",
                            {
                              dateStyle: "medium",
                            },
                          ).format(work.publishedAt)
                        : "Tarih belirtilmedi"}
                    </time>
                    <Link href={bookHref}>
                      Eseri incele →
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </PublicHubShell>
  );
}
