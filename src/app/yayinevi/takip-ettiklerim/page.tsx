import type { Metadata } from "next";

import {
  DiscoveryPagination,
  DiscoveryResultSummary,
} from "@/components/discovery/DiscoveryListChrome";
import { AppShell } from "@/components/layout/AppShell";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";
import { requirePublisherDiscoveryAccess } from "@/features/publisher-discovery/access";
import { PublisherCollectionFilterDesk } from "@/features/publisher-discovery/components/PublisherCollectionFilterDesk";
import { PublisherFollowingAuthorsTable } from "@/features/publisher-discovery/components/PublisherFollowingAuthorsTable";
import {
  getPublisherFollowingAuthors,
  normalizePublisherFollowingFilters,
  type PublisherFollowingFilters,
} from "@/features/publisher-discovery/following-query";
import {
  getAdultContentAccess,
  visibleMemberContentRatings,
} from "@/lib/adult-content-access";
import { DISCOVERY_PAGE_SIZE } from "@/lib/discovery-list-standard";
import { workContentRatingDetails } from "@/lib/work-content-classification";
import "@/features/publisher-discovery/publisher-discovery.css";

export const metadata: Metadata = {
  description: "Yayınevinizin takip ettiği public yazarları listeleyin.",
  title: "Yayınevi Takip Ettiklerim | İlkOku",
};

export const dynamic = "force-dynamic";

function pageHref(filters: PublisherFollowingFilters, page: number) {
  const params = new URLSearchParams();
  if (filters.query) params.set("arama", filters.query);
  if (filters.genre) params.set("tur", filters.genre);
  if (filters.contentRating) params.set("hitap", filters.contentRating);
  if (filters.city) params.set("sehir", filters.city);
  if (page > 1) params.set("sayfa", String(page));
  const query = params.toString();
  return query
    ? `/yayinevi/takip-ettiklerim?${query}`
    : "/yayinevi/takip-ettiklerim";
}

export default async function PublisherFollowingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await requirePublisherDiscoveryAccess(
    "/yayinevi/takip-ettiklerim",
    "follow_author",
  );
  const adultAccess = access.profile.adminPublisherView
    ? { canAccessAdultContent: true, isAdult: true }
    : await getAdultContentAccess(access.profile.id);
  const visibleRatings = visibleMemberContentRatings(
    adultAccess.canAccessAdultContent,
  );
  const filters = normalizePublisherFollowingFilters(await searchParams);
  if (
    filters.contentRating === "adult_18" &&
    !adultAccess.canAccessAdultContent
  ) {
    filters.contentRating = undefined;
  }
  const data = await getPublisherFollowingAuthors(
    access.publisherId,
    filters,
    adultAccess.canAccessAdultContent,
  );
  const canMutate = !access.profile.adminPublisherView;
  const returnTo = pageHref(filters, data.currentPage);
  const activeFilters = [
    filters.query
      ? {
          href: pageHref({ ...filters, page: 1, query: "" }, 1),
          label: `Arama: ${filters.query}`,
        }
      : null,
    filters.genre
      ? {
          href: pageHref({ ...filters, genre: "", page: 1 }, 1),
          label: `Tür: ${filters.genre}`,
        }
      : null,
    filters.contentRating
      ? {
          href: pageHref({ ...filters, contentRating: undefined, page: 1 }, 1),
          label: `Yaş: ${workContentRatingDetails[filters.contentRating].shortLabel}`,
        }
      : null,
    filters.city
      ? {
          href: pageHref({ ...filters, city: "", page: 1 }, 1),
          label: `Şehir: ${filters.city}`,
        }
      : null,
  ].filter((item): item is { href: string; label: string } => item !== null);

  return (
    <AppShell profile={access.profile}>
      <div className="publisher-discovery">
        <EditorPageHeader
          description="Ortak Yazar Havuzu'nda yayınevinizin takip ettiği yazarları ve eşleşen public eserlerini yönetin."
          eyebrow={access.companyName}
          title="Takip Ettiklerim"
        />

        <PublisherCollectionFilterDesk
          activeFilters={activeFilters}
          city={filters.city}
          clearHref="/yayinevi/takip-ettiklerim"
          contentRating={filters.contentRating}
          genre={filters.genre}
          heading="Takip edilen yazarları daraltın"
          hint="Tüm takip edilen yazarları görüyorsunuz."
          kind="author"
          query={filters.query}
          ratingOptions={visibleRatings}
        />

        <DiscoveryResultSummary
          currentPage={data.currentPage}
          noun="yazar"
          pageSize={DISCOVERY_PAGE_SIZE}
          totalCount={data.totalCount}
          visibleCount={data.rows.length}
        />

        {data.rows.length === 0 ? (
          <section className="publisher-discovery-empty">
            <h2>Eşleşen takip edilen yazar bulunmuyor</h2>
            <p>Filtreleri değiştirin veya Yazar Keşfet ekranından yeni bir yazarı takip edin.</p>
          </section>
        ) : (
          <PublisherFollowingAuthorsTable
            canMutate={canMutate}
            returnTo={returnTo}
            rows={data.rows}
          />
        )}

        <DiscoveryPagination
          ariaLabel="Yayınevi takip sayfalama"
          currentPage={data.currentPage}
          hrefForPage={(page) => pageHref(filters, page)}
          totalPages={data.totalPages}
        />
      </div>
    </AppShell>
  );
}
