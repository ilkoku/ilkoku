import Link from "next/link";

import {
  getPublicWorkLibrary,
  PUBLIC_WORK_PAGE_SIZE,
  type PublicWorkSort,
} from "@/features/public-discovery/library";
import { PublicHubShell } from "@/features/public-discovery/PublicHubShell";
import { PublicWorkStream } from "@/features/public-discovery/PublicWorkStream";

const baseUrl = "https://ilkoku.com";

type FeedSearchParams = {
  arama?: string;
  sayfa?: string;
  tur?: string;
};

function pageNumber(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "", 10);

  return Number.isFinite(parsed) && parsed > 0
    ? Math.min(parsed, 10_000)
    : 1;
}

function feedHref(
  basePath: `/eserler/${string}`,
  filters: { genre?: string; search?: string },
  page: number,
) {
  const parameters = new URLSearchParams();

  if (filters.search) {
    parameters.set("arama", filters.search);
  }

  if (filters.genre) {
    parameters.set("tur", filters.genre);
  }

  if (page > 1) {
    parameters.set("sayfa", String(page));
  }

  const query = parameters.toString();
  return query ? `${basePath}?${query}` : basePath;
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
  searchParams: Promise<FeedSearchParams>;
  sort: PublicWorkSort;
}) {
  const query = await searchParams;
  const search = query.arama?.trim().slice(0, 100) || undefined;
  const genre = query.tur?.trim().slice(0, 120) || undefined;
  const library = await getPublicWorkLibrary(
    { genre, search, sort },
    pageNumber(query.sayfa),
  );
  const currentPath = feedHref(
    basePath,
    { genre, search },
    library.currentPage,
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
              Keşfe açık eserlere dön
            </Link>
          </p>
        </header>

        <section
          aria-labelledby="eser-akisi"
          className="public-hub__section"
        >
          <div className="public-hub__section-heading">
            <h2 id="eser-akisi">Keşfe açık eserler</h2>
            <span>{library.totalCount} eser</span>
          </div>

          <form
            action={basePath}
            className="public-hub__filters"
            method="get"
          >
            <label>
              <span>Eser veya yazar ara</span>
              <input
                defaultValue={search}
                maxLength={100}
                name="arama"
                placeholder="Başlık, tanıtım veya yazar"
                type="search"
              />
            </label>

            <label>
              <span>Tür</span>
              <select defaultValue={genre ?? ""} name="tur">
                <option value="">Tüm türler</option>
                {library.genres.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <button type="submit">Filtrele</button>

            {search || genre ? (
              <Link href={basePath}>Filtreleri temizle</Link>
            ) : null}
          </form>

          {library.works.length > 0 ? (
            <PublicWorkStream
              dateMode={
                sort === "updated"
                  ? "updated"
                  : "published"
              }
              returnPath={currentPath}
              works={library.works}
            />
          ) : (
            <div className="public-hub__empty">
              <strong>{emptyText}</strong>
              <p>
                Yalnızca aktif yazarlara ait, Türkçe,
                yayımlanmış ve keşfe açık eserler bu akışa
                girer. Bölüm metnini okumak için oturum gerekir.
              </p>
              {search || genre ? (
                <Link href={basePath}>
                  Bu akıştaki tüm eserleri göster
                </Link>
              ) : (
                <Link href="/nasil-calisir#eser-ilkoku-da-nasil-ilerler">
                  Eserin İlkOku’daki yolculuğunu öğren
                </Link>
              )}
            </div>
          )}

          {library.totalPages > 1 ? (
            <nav
              aria-label="Eser akışı sayfaları"
              className="public-hub__pagination"
            >
              {library.currentPage > 1 ? (
                <Link
                  href={feedHref(
                    basePath,
                    { genre, search },
                    library.currentPage - 1,
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
                  href={feedHref(
                    basePath,
                    { genre, search },
                    library.currentPage + 1,
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
