import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getPublicGenreBySlug,
  getPublicWorkLibrary,
  PUBLIC_WORK_PAGE_SIZE,
} from "@/features/public-discovery/library";
import { PublicHubShell } from "@/features/public-discovery/PublicHubShell";
import { PublicWorkStream } from "@/features/public-discovery/PublicWorkStream";

const baseUrl = "https://ilkoku.com";
const MAX_RETURN_PATH_LENGTH = 1500;

type GenrePageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    from?: string;
    sayfa?: string;
  }>;
};

function pageNumber(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "", 10);

  return Number.isFinite(parsed) && parsed > 0
    ? Math.min(parsed, 10_000)
    : 1;
}

function safeReturnPath(value: string | undefined) {
  if (
    !value ||
    value.length > MAX_RETURN_PATH_LENGTH ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return "/turler";
  }

  return value;
}

function genrePageHref(
  slug: string,
  page: number,
  returnTo: string,
) {
  const parameters = new URLSearchParams();

  if (page > 1) {
    parameters.set("sayfa", String(page));
  }

  if (returnTo !== "/turler") {
    parameters.set("from", returnTo);
  }

  const query = parameters.toString();
  return query ? `/turler/${slug}?${query}` : `/turler/${slug}`;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
  searchParams,
}: GenrePageProps): Promise<Metadata> {
  const [{ slug }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  const genre = await getPublicGenreBySlug(slug);

  if (!genre) {
    return {
      title: "Tür bulunamadı | İlkOku",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const page = pageNumber(query.sayfa);
  const canonical = `/turler/${genre.slug}`;
  const title = `${genre.label} Eserleri | İlkOku`;
  const description =
    `İlkOku’da keşfe açık yayımlanan ${genre.label} türündeki Türkçe eserleri keşfedin.`;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    robots: {
      index: page === 1 && !query.from,
      follow: true,
    },
    openGraph: {
      type: "website",
      locale: "tr_TR",
      url: canonical,
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function PublicGenrePage({
  params,
  searchParams,
}: GenrePageProps) {
  const [{ slug }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  const genre = await getPublicGenreBySlug(slug);

  if (!genre) {
    notFound();
  }

  const returnTo = safeReturnPath(query.from);
  const library = await getPublicWorkLibrary(
    {
      genre: genre.label,
      sort: "newest",
    },
    pageNumber(query.sayfa),
  );
  const currentPath = genrePageHref(
    genre.slug,
    library.currentPage,
    returnTo,
  );
  const canonical = `${baseUrl}/turler/${genre.slug}`;
  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `${genre.label} eserleri`,
      url: canonical,
      inLanguage: "tr-TR",
      mainEntity: {
        "@type": "ItemList",
        itemListElement: library.works.map(
          (work, index) => ({
            "@type": "ListItem",
            position:
              (library.currentPage - 1) *
                PUBLIC_WORK_PAGE_SIZE +
              index +
              1,
            name: work.title,
            url: `${baseUrl}/kitap/${work.slug}`,
          }),
        ),
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
          name: "Türler",
          item: `${baseUrl}/turler`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: genre.label,
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
            TÜR KÜTÜPHANESİ
          </p>
          <h1>{genre.label} eserleri</h1>
          <p>
            {genre.label} türündeki keşfe açık eserleri
            kalıcı kitap bağlantılarıyla keşfedin.
          </p>
          <p>
            <Link href={returnTo}>← Geldiğin sayfaya dön</Link>
          </p>
        </header>

        <section
          aria-labelledby="tur-eserleri"
          className="public-hub__section"
        >
          <div className="public-hub__section-heading">
            <h2 id="tur-eserleri">
              {genre.label} seçkisi
            </h2>
            <span>{library.totalCount} eser</span>
          </div>

          {library.works.length > 0 ? (
            <PublicWorkStream
              returnPath={currentPath}
              works={library.works}
            />
          ) : (
            <div className="public-hub__empty">
              <strong>
                Bu türde keşfe açık eser bulunamadı.
              </strong>
              <p>
                Eser yayından kaldırıldığında boş tür sayfası
                da sitemap’ten otomatik çıkar.
              </p>
              <Link href={returnTo}>
                Diğer türleri görüntüle
              </Link>
            </div>
          )}

          {library.totalPages > 1 ? (
            <nav
              aria-label="Tür eser sayfaları"
              className="public-hub__pagination"
            >
              {library.currentPage > 1 ? (
                <Link
                  href={genrePageHref(
                    genre.slug,
                    library.currentPage - 1,
                    returnTo,
                  )}
                  rel="prev"
                >
                  ← Önceki
                </Link>
              ) : (
                <span />
              )}
              <span>
                {library.currentPage} / {library.totalPages}
              </span>
              {library.currentPage <
              library.totalPages ? (
                <Link
                  href={genrePageHref(
                    genre.slug,
                    library.currentPage + 1,
                    returnTo,
                  )}
                  rel="next"
                >
                  Sonraki →
                </Link>
              ) : (
                <span />
              )}
            </nav>
          ) : null}
        </section>
      </main>
    </PublicHubShell>
  );
}