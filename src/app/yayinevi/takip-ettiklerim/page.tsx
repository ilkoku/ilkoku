import Link from "next/link";
import type { Metadata } from "next";

import { AppShell } from "@/components/layout/AppShell";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";
import {
  requirePublisherDiscoveryAccess,
} from "@/features/publisher-discovery/access";
import { PublisherFollowingAuthorsTable } from "@/features/publisher-discovery/components/PublisherFollowingAuthorsTable";
import {
  getPublisherFollowingAuthors,
  normalizePublisherFollowingFilters,
  type PublisherFollowingFilters,
} from "@/features/publisher-discovery/following-query";
import "@/features/publisher-discovery/publisher-discovery.css";

export const metadata: Metadata = {
  description:
    "Yayınevinizin takip ettiği public yazarları listeleyin.",
  title:
    "Yayınevi Takip Ettiklerim | İlkOku",
};

export const dynamic = "force-dynamic";

function pageHref(
  filters: PublisherFollowingFilters,
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
    ? `/yayinevi/takip-ettiklerim?${query}`
    : "/yayinevi/takip-ettiklerim";
}

export default async function PublisherFollowingPage({
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
      "/yayinevi/takip-ettiklerim",
      "follow_author",
    );
  const filters =
    normalizePublisherFollowingFilters(
      await searchParams,
    );
  const data =
    await getPublisherFollowingAuthors(
      access.publisherId,
      filters,
    );
  const canMutate =
    !access.profile.adminPublisherView;
  const returnTo =
    pageHref(
      filters,
      data.currentPage,
    );

  return (
    <AppShell profile={access.profile}>
      <div className="publisher-discovery">
        <EditorPageHeader
          description="Yayınevinizin takip ettiği public yazarları ve yayımlanmış eserlerini tek listeden inceleyin."
          eyebrow={access.companyName}
          title="Takip Ettiklerim"
        />

        <form
          className="publisher-discovery-filters publisher-saved-list__filters"
          method="get"
        >
          <label>
            <span>Yazar veya eser ara</span>
            <input
              defaultValue={filters.query}
              name="arama"
              placeholder="Yazar, public kimlik veya eser"
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
                href="/yayinevi/takip-ettiklerim"
              >
                Temizle
              </Link>
            ) : null}
          </div>
        </form>

        <section className="publisher-discovery-summary">
          <div>
            <span>Takip edilen yazarlar</span>
            <strong>
              {data.totalCount} yazar
            </strong>
          </div>
          <p>
            Son yayımlanan eserlere ve
            yayımlanmış bölümlere doğrudan
            ulaşabilirsiniz.
          </p>
        </section>

        {data.rows.length === 0 ? (
          <section className="publisher-discovery-empty">
            <h2>
              Takip edilen yazar bulunmuyor
            </h2>
            <p>
              Yazar Keşfet ekranından
              “Yazarı takip et” işlemini kullanın.
            </p>
            <Link
              className="button button--primary"
              href="/yayinevi/kesfet/yazarlar"
            >
              Yazar Keşfet
            </Link>
          </section>
        ) : (
          <PublisherFollowingAuthorsTable
            canMutate={canMutate}
            returnTo={returnTo}
            rows={data.rows}
          />
        )}

        <footer className="publisher-discovery-pagination">
          <span>
            {data.totalCount} yazardan{" "}
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
