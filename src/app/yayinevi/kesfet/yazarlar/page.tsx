import Link from "next/link";
import type { Metadata } from "next";

import { AppShell } from "@/components/layout/AppShell";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";
import {
  requirePublisherDiscoveryAccess,
} from "@/features/publisher-discovery/access";
import {
  getPublisherAuthorDiscovery,
  normalizePublisherAuthorDiscoveryFilters,
  type PublisherAuthorDiscoveryFilters,
} from "@/features/publisher-discovery/author-query";
import { PublisherAuthorsTable } from "@/features/publisher-discovery/components/PublisherAuthorsTable";
import { getPublisherAuthorFollowIds } from "@/features/publisher-discovery/engagement-query";
import "@/features/publisher-discovery/publisher-discovery.css";

export const metadata: Metadata = {
  description:
    "Yayıneviniz için public eseri bulunan yazarları keşfedin.",
  title:
    "Yayınevi Yazar Keşfi | İlkOku",
};

export const dynamic = "force-dynamic";

function pageHref(
  filters: PublisherAuthorDiscoveryFilters,
  page: number,
) {
  const params = new URLSearchParams();

  if (filters.query) {
    params.set("arama", filters.query);
  }

  if (filters.genre) {
    params.set("tur", filters.genre);
  }

  if (filters.city) {
    params.set("sehir", filters.city);
  }

  if (page > 1) {
    params.set("sayfa", String(page));
  }

  const query = params.toString();

  return query
    ? `/yayinevi/kesfet/yazarlar?${query}`
    : "/yayinevi/kesfet/yazarlar";
}

export default async function PublisherAuthorDiscoveryPage({
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
      "/yayinevi/kesfet/yazarlar",
      "discover_authors",
    );
  const filters =
    normalizePublisherAuthorDiscoveryFilters(
      await searchParams,
    );
  const data =
    await getPublisherAuthorDiscovery(filters);
  const followedAuthorIds =
    await getPublisherAuthorFollowIds(
      access.publisherId,
      data.rows.map((row) => row.id),
    );
  const canFollow =
    !access.profile.adminPublisherView &&
    access.permissions.includes("follow_author");
  const hasFilters = Boolean(
    filters.query ||
      filters.genre ||
      filters.city,
  );

  return (
    <AppShell profile={access.profile}>
      <div className="publisher-discovery">
        <EditorPageHeader
          description="En az bir public ve yayımlanmış eseri bulunan aktif yazarların yalnızca herkese açık kimlik, profil ve eser verilerini inceleyin."
          eyebrow={access.companyName}
          title="Yazar Keşfet"
        />

        <form
          className="publisher-discovery-filters publisher-author-filters"
          method="get"
        >
          <label>
            <span>Yazar veya eser ara</span>
            <input
              defaultValue={filters.query}
              name="arama"
              placeholder="Rumuz, public kimlik veya eser"
              type="search"
            />
          </label>

          <label>
            <span>Tür</span>
            <input
              defaultValue={filters.genre}
              name="tur"
              placeholder="Örn. Roman"
            />
          </label>

          <label>
            <span>Şehir</span>
            <input
              defaultValue={filters.city}
              name="sehir"
              placeholder="Örn. İstanbul"
            />
          </label>

          <div className="publisher-discovery-filter-actions">
            <button
              className="button button--primary"
              type="submit"
            >
              Filtrele
            </button>

            {hasFilters ? (
              <Link
                className="button button--ghost"
                href="/yayinevi/kesfet/yazarlar"
              >
                Temizle
              </Link>
            ) : null}
          </div>
        </form>

        <section className="publisher-discovery-summary">
          <div>
            <span>Keşif sonucu</span>
            <strong>
              {data.totalCount} yazar
            </strong>
          </div>
          <p>
            Bu ekran salt okunurdur.
            Yazar beğenme, favorileme ve
            takip işlemleri sonraki sprintte
            yetkileriyle birlikte açılacaktır.
          </p>
        </section>

        {data.rows.length === 0 ? (
          <section className="publisher-discovery-empty">
            <h2>
              Eşleşen yazar bulunamadı
            </h2>
            <p>
              Arama veya filtreleri
              değiştirerek yeniden deneyin.
            </p>
          </section>
        ) : (
          <PublisherAuthorsTable
            canFollow={canFollow}
            returnTo={pageHref(
              filters,
              data.currentPage,
            )}
            rows={data.rows}
            followedAuthorIds={followedAuthorIds}
          />
        )}

        <footer
          aria-label="Yazar sayfalama"
          className="publisher-discovery-pagination"
        >
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
