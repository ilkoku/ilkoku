import Link from "next/link";
import type { Metadata } from "next";

import "@/components/discovery/discovery-filter-desk.css";
import { AppShell } from "@/components/layout/AppShell";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";
import { requirePublisherDiscoveryAccess } from "@/features/publisher-discovery/access";
import {
  getPublisherAuthorDiscovery,
  normalizePublisherAuthorDiscoveryFilters,
  type PublisherAuthorDiscoveryFilters,
} from "@/features/publisher-discovery/author-query";
import { PublisherAuthorsTable } from "@/features/publisher-discovery/components/PublisherAuthorsTable";
import {
  getPublisherAuthorFavoriteIds,
  getPublisherAuthorFollowIds,
  getPublisherAuthorLikeIds,
} from "@/features/publisher-discovery/engagement-query";
import { getPublisherShareRecipientOptions } from "@/features/publisher-discovery/sharing-repository";
import {
  getAdultContentAccess,
  visibleMemberContentRatings,
} from "@/lib/adult-content-access";
import { GENRE_LABELS } from "@/lib/genres";
import { workContentRatingDetails } from "@/lib/work-content-classification";
import "@/features/publisher-discovery/publisher-discovery.css";

export const metadata: Metadata = {
  description: "Yayıneviniz için public eseri bulunan yazarları keşfedin.",
  title: "Yayınevi Yazar Keşfi | İlkOku",
};

export const dynamic = "force-dynamic";

function pageHref(
  filters: PublisherAuthorDiscoveryFilters,
  page: number,
) {
  const params = new URLSearchParams();

  if (filters.query) params.set("arama", filters.query);
  if (filters.genre) params.set("tur", filters.genre);
  if (filters.contentRating) params.set("hitap", filters.contentRating);
  if (filters.city) params.set("sehir", filters.city);
  if (page > 1) params.set("sayfa", String(page));

  const query = params.toString();
  return query
    ? `/yayinevi/kesfet/yazarlar?${query}`
    : "/yayinevi/kesfet/yazarlar";
}

export default async function PublisherAuthorDiscoveryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await requirePublisherDiscoveryAccess(
    "/yayinevi/kesfet/yazarlar",
    "discover_authors",
  );
  const adultAccess = access.profile.adminPublisherView
    ? {
        canAccessAdultContent: true,
        isAdult: true,
      }
    : await getAdultContentAccess(access.profile.id);
  const visibleRatings = visibleMemberContentRatings(
    adultAccess.canAccessAdultContent,
  );
  const filters = normalizePublisherAuthorDiscoveryFilters(await searchParams);
  if (
    filters.contentRating === "adult_18" &&
    !adultAccess.canAccessAdultContent
  ) {
    filters.contentRating = "";
  }
  const data = await getPublisherAuthorDiscovery(
    filters,
    adultAccess.canAccessAdultContent,
  );
  const authorIds = data.rows.map((row) => row.id);
  const [
    likedAuthorIds,
    favoriteAuthorIds,
    followedAuthorIds,
    shareMembers,
  ] = await Promise.all([
    getPublisherAuthorLikeIds(access.publisherId, authorIds),
    getPublisherAuthorFavoriteIds(access.publisherId, authorIds),
    getPublisherAuthorFollowIds(access.publisherId, authorIds),
    getPublisherShareRecipientOptions(access.profile.id),
  ]);
  const canMutate = !access.profile.adminPublisherView;
  const canLike =
    canMutate && access.permissions.includes("like_author");
  const canFavorite =
    canMutate && access.permissions.includes("favorite_author");
  const canFollow =
    canMutate && access.permissions.includes("follow_author");
  const canShareInternal =
    canMutate && access.permissions.includes("share_internal");
  const canShareEmail =
    canMutate && access.permissions.includes("share_email");
  const activeFilters = [
    filters.query
      ? {
          href: pageHref({ ...filters, query: "" }, 1),
          label: `Arama: ${filters.query}`,
        }
      : null,
    filters.genre
      ? {
          href: pageHref({ ...filters, genre: "" }, 1),
          label: `Tür: ${filters.genre}`,
        }
      : null,
    filters.contentRating
      ? {
          href: pageHref({ ...filters, contentRating: "" }, 1),
          label: `Yaş: ${workContentRatingDetails[filters.contentRating].shortLabel}`,
        }
      : null,
    filters.city
      ? {
          href: pageHref({ ...filters, city: "" }, 1),
          label: `Şehir: ${filters.city}`,
        }
      : null,
  ].filter((item): item is { href: string; label: string } => item !== null);
  const hasFilters = activeFilters.length > 0;
  const returnTo = pageHref(filters, data.currentPage);

  return (
    <AppShell profile={access.profile}>
      <div className="publisher-discovery">
        <EditorPageHeader
          description="Public eseri bulunan yazarları inceleyin; yetkinize göre beğenin, favorileyin, takip edin veya zorunlu notla paylaşın."
          eyebrow={access.companyName}
          title="Yazar Keşfet"
        />

        {adultAccess.isAdult && !adultAccess.canAccessAdultContent ? (
          <section className="publisher-discovery-summary">
            <div>
              <span>18+ içerik tercihi</span>
              <strong>İkinci onay gerekli</strong>
            </div>
            <p>
              18+ eserleri üzerinden yazar keşfi yapmak için açık onay verin.
            </p>
            <Link
              className="button button--outline"
              href="/yetiskin-icerik-onayi?sonraki=%2Fyayinevi%2Fkesfet%2Fyazarlar"
            >
              18+ içerikleri aç
            </Link>
          </section>
        ) : null}

        <section className="role-filter-desk" aria-label="Yayınevi yazar filtre masası">
          <header className="role-filter-desk__header">
            <div>
              <span>Filtre masası</span>
              <strong>Yayınevi için uygun yazarları daraltın</strong>
            </div>
            {hasFilters ? (
              <Link href="/yayinevi/kesfet/yazarlar">Tüm filtreleri temizle</Link>
            ) : null}
          </header>

          <form className="role-filter-desk__form" method="get">
            <label className="role-filter-field--search">
              <span>Arama</span>
              <input
                defaultValue={filters.query}
                name="arama"
                placeholder="Rumuz, public kimlik veya eser"
                type="search"
              />
            </label>

            <label>
              <span>Tür</span>
              <select defaultValue={filters.genre} name="tur">
                <option value="">Tüm türler</option>
                {GENRE_LABELS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Hitap yaşı</span>
              <select defaultValue={filters.contentRating} name="hitap">
                <option value="">Tüm yaşlar</option>
                {visibleRatings.map((rating) => (
                  <option key={rating} value={rating}>
                    {workContentRatingDetails[rating].label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Şehir</span>
              <input
                defaultValue={filters.city}
                name="sehir"
                placeholder="Örn. İstanbul"
              />
            </label>

            <div className="role-filter-desk__actions">
              <button className="button button--primary" type="submit">
                Masayı Güncelle
              </button>
              {hasFilters ? (
                <Link className="button button--ghost" href="/yayinevi/kesfet/yazarlar">
                  Temizle
                </Link>
              ) : null}
            </div>
          </form>

          {activeFilters.length > 0 ? (
            <div className="role-filter-desk__active" aria-label="Aktif filtreler">
              <span>Aktif</span>
              {activeFilters.map((item) => (
                <Link href={item.href} key={`${item.label}-${item.href}`}>
                  {item.label}
                  <b aria-hidden="true">×</b>
                </Link>
              ))}
            </div>
          ) : (
            <p className="role-filter-desk__hint">
              Filtre seçmeden yayınevine açık yazar havuzunu görüyorsunuz.
            </p>
          )}
        </section>

        <section className="role-filter-result" aria-live="polite">
          <span>Masadaki sonuç</span>
          <strong>{data.totalCount} yazar</strong>
        </section>

        {data.rows.length === 0 ? (
          <section className="publisher-discovery-empty">
            <h2>Eşleşen yazar bulunamadı</h2>
            <p>Arama veya filtreleri değiştirerek yeniden deneyin.</p>
          </section>
        ) : (
          <PublisherAuthorsTable
            canFavorite={canFavorite}
            canFollow={canFollow}
            canLike={canLike}
            canShareEmail={canShareEmail}
            canShareInternal={canShareInternal}
            favoriteAuthorIds={favoriteAuthorIds}
            followedAuthorIds={followedAuthorIds}
            likedAuthorIds={likedAuthorIds}
            returnTo={returnTo}
            rows={data.rows}
            shareMembers={shareMembers}
          />
        )}

        <footer
          aria-label="Yazar sayfalama"
          className="publisher-discovery-pagination"
        >
          <span>
            {data.totalCount} yazardan {data.first}–{data.last} arası gösteriliyor.
          </span>

          <div>
            {data.currentPage > 1 ? (
              <Link
                className="button button--ghost"
                href={pageHref(filters, data.currentPage - 1)}
              >
                Önceki
              </Link>
            ) : null}

            <strong>
              {data.currentPage} / {data.totalPages}
            </strong>

            {data.currentPage < data.totalPages ? (
              <Link
                className="button button--ghost"
                href={pageHref(filters, data.currentPage + 1)}
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
