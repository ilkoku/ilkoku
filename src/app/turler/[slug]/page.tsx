import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getPublicGenreBySlug,
  getPublicWorkLibrary,
} from "@/features/public-discovery/library";
import { PublicHubShell } from "@/features/public-discovery/PublicHubShell";
import { PublicWorkStream } from "@/features/public-discovery/PublicWorkStream";

const baseUrl = "https://ilkoku.com";

type GenrePageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    sayfa?: string;
  }>;
};

function pageNumber(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "", 10);

  return Number.isFinite(parsed) && parsed > 0
    ? Math.min(parsed, 10_000)
    : 1;
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
    `İlkOku’da herkese açık yayımlanan ${genre.label} türündeki Türkçe eserleri keşfedin.`;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    robots: {
      index: page === 1,
      follow: true,
    },
    openGraph: {
      type: "website",
      locale: "tr_TR",
      url: canonical,
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

  const library = await getPublicWorkLibrary(
    {
      genre: genre.label,
      sort: "newest",
    },
    pageNumber(query.sayfa),
  );
  const canonical = `${baseUrl}/turler/${genre.slug}`;
  const schema = {
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
            (library.currentPage - 1) * 18 +
            index +
            1,
          name: work.title,
          url: `${baseUrl}/kitap/${work.slug}`,
        }),
      ),
    },
  };

  return (
    <PublicHubShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema).replace(
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
            {genre.label} türünde herkese açık yayımlanan
            eserleri kalıcı kitap bağlantılarıyla keşfedin.
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
            <PublicWorkStream works={library.works} />
          ) : (
            <div className="public-hub__empty">
              <strong>
                Bu türde public eser bulunamadı.
              </strong>
              <p>
                Eser yayından kaldırıldığında boş tür sayfası
                da sitemap’ten otomatik çıkar.
              </p>
              <Link href="/turler">
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
                  href={
                    library.currentPage === 2
                      ? `/turler/${genre.slug}`
                      : `/turler/${genre.slug}?sayfa=${library.currentPage - 1}`
                  }
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
                  href={`/turler/${genre.slug}?sayfa=${library.currentPage + 1}`}
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
