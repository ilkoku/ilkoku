import Link from "next/link";
import type { Metadata } from "next";

import { AppShell } from "@/components/layout/AppShell";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";
import {
  requirePublisherDiscoveryAccess,
} from "@/features/publisher-discovery/access";
import { PublisherFavoriteWorksTable } from "@/features/publisher-discovery/components/PublisherFavoriteWorksTable";
import {
  getPublisherLikedWorks,
  normalizePublisherFavoriteFilters,
  type PublisherFavoriteFilters,
} from "@/features/publisher-discovery/favorites-query";
import "@/features/publisher-discovery/publisher-discovery.css";

export const metadata: Metadata = {
  description:
    "Yayınevinizin beğendiği public eserleri listeleyin.",
  title:
    "Yayınevi Favorilerim | İlkOku",
};

export const dynamic = "force-dynamic";

function pageHref(
  filters: PublisherFavoriteFilters,
  page: number,
) {
  const params = new URLSearchParams();

  if (filters.query) {
    params.set("arama", filters.query);
  }

  if (page > 1) {
    params.set("sayfa", String(page));
  }

  const query = params.toString();

  return query
    ? `/yayinevi/favorilerim?${query}`
    : "/yayinevi/favorilerim";
}

export default async function PublisherFavoritesPage({
  searchParams,
}: {
  searchParams: Promise<
    Record<
      string,
      string | string[] | undefined
    >
  >;
}) {
  const access =
    await requirePublisherDiscoveryAccess(
      "/yayinevi/favorilerim",
      "like_work",
    );
  const filters =
    normalizePublisherFavoriteFilters(
      await searchParams,
    );
  const data =
    await getPublisherLikedWorks(
      access.publisherId,
      filters,
    );
  const canMutate =
    !access.profile.adminPublisherView;
  const canViewPassport =
    access.permissions.includes(
      "view_authorized_passport",
    );
  const returnTo =
    pageHref(
      filters,
      data.currentPage,
    );

  return (
    <AppShell profile={access.profile}>
      <div className="publisher-discovery">
        <EditorPageHeader
          description="Yayıneviniz adına beğenilen public eserleri okuyun, eser sayfasını ve yetkiniz varsa Eser Pasaportu'nu açın."
          eyebrow={access.companyName}
          title="Favorilerim"
        />

        <form
          className="publisher-discovery-filters publisher-saved-list__filters"
          method="get"
        >
          <label>
            <span>Eser veya yazar ara</span>
            <input
              defaultValue={filters.query}
              name="arama"
              placeholder="Eser adı, tür veya yazar"
              type="search"
            />
          </label>

          <div className="publisher-discovery-filter-actions">
            <button
              className="button button--primary"
              type="submit"
            >
              Filtrele
            </button>

            {filters.query ? (
              <Link
                className="button button--ghost"
                href="/yayinevi/favorilerim"
              >
                Temizle
              </Link>
            ) : null}
          </div>
        </form>

        <section className="publisher-discovery-summary">
          <div>
            <span>Beğenilen eserler</span>
            <strong>
              {data.totalCount} eser
            </strong>
          </div>
          <p>
            Eser Keşfet ekranında beğendiğiniz
            eserler otomatik olarak bu listede
            gösterilir.
          </p>
        </section>

        {data.rows.length === 0 ? (
          <section className="publisher-discovery-empty">
            <h2>
              Beğenilen eser bulunmuyor
            </h2>
            <p>
              Eser Keşfet ekranından
              “Eseri beğen” işlemini kullanın.
            </p>
            <Link
              className="button button--primary"
              href="/yayinevi/kesfet/eserler"
            >
              Eser Keşfet
            </Link>
          </section>
        ) : (
          <PublisherFavoriteWorksTable
            canMutate={canMutate}
            canViewPassport={canViewPassport}
            returnTo={returnTo}
            rows={data.rows}
          />
        )}

        <footer className="publisher-discovery-pagination">
          <span>
            {data.totalCount} eserden{" "}
            {data.first}–{data.last} arası
            gösteriliyor.
          </span>

          <div>
            {data.currentPage > 1 ? (
              <Link
                className="button button--ghost"
                href={pageHref(
                  filters,
                  data.currentPage - 1,
                )}
              >
                Önceki
              </Link>
            ) : null}

            <strong>
              {data.currentPage} /{" "}
              {data.totalPages}
            </strong>

            {data.currentPage <
            data.totalPages ? (
              <Link
                className="button button--ghost"
                href={pageHref(
                  filters,
                  data.currentPage + 1,
                )}
              >
                Sonraki
              </Link>
            ) : null}
          </div>
        </footer>
      </div>
    </AppShell>
  );
}
