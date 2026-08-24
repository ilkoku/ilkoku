import Link from "next/link";

import {
  getPublicWorkLibrary,
  PUBLIC_WORK_PAGE_SIZE,
  type PublicWorkSort,
} from "@/features/public-discovery/library";
import { PublicHubShell } from "@/features/public-discovery/PublicHubShell";
import { PublicWorkStream } from "@/features/public-discovery/PublicWorkStream";

const baseUrl = "https://ilkoku.com";

function pageNumber(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "", 10);

  return Number.isFinite(parsed) && parsed > 0
    ? Math.min(parsed, 10_000)
    : 1;
}

export async function PublicWorkFeedPage({
  basePath,
  description,
  emptyText,
  eyebrow,
  heading,
  searchParams,
  sort,
}: {
  basePath: `/eserler/${string}`;
  description: string;
  emptyText: string;
  eyebrow: string;
  heading: string;
  searchParams: Promise<{ sayfa?: string }>;
  sort: PublicWorkSort;
}) {
  const query = await searchParams;
  const library = await getPublicWorkLibrary(
    { sort },
    pageNumber(query.sayfa),
  );
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: heading,
    description,
    url: `${baseUrl}${basePath}`,
    inLanguage: "tr-TR",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: library.works.length,
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
            {eyebrow}
          </p>
          <h1>{heading}</h1>
          <p>{description}</p>
          <p>
            <Link href="/eserler">
              Arama ve tür filtrelerine dön
            </Link>
          </p>
        </header>

        <section
          aria-labelledby="eser-akisi"
          className="public-hub__section"
        >
          <div className="public-hub__section-heading">
            <h2 id="eser-akisi">Herkese açık yayınlar</h2>
            <span>{library.totalCount} eser</span>
          </div>

          {library.works.length > 0 ? (
            <PublicWorkStream
              dateMode={
                sort === "updated"
                  ? "updated"
                  : "published"
              }
              works={library.works}
            />
          ) : (
            <div className="public-hub__empty">
              <strong>{emptyText}</strong>
              <p>
                Yalnızca aktif yazarlara ait, Türkçe,
                yayımlanmış ve herkese açık eserler bu akışa
                girer.
              </p>
              <Link href="/rehber/ilk-eseri-yayinlama-rehberi">
                Eser yayımlama rehberini oku
              </Link>
            </div>
          )}

          {library.totalPages > 1 ? (
            <nav
              aria-label="Eser akışı sayfaları"
              className="public-hub__pagination"
            >
              {library.currentPage > 1 ? (
                <Link
                  href={
                    library.currentPage === 2
                      ? basePath
                      : `${basePath}?sayfa=${library.currentPage - 1}`
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
                  href={`${basePath}?sayfa=${library.currentPage + 1}`}
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
