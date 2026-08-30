import Link from "next/link";
import type { Metadata } from "next";

import {
  DiscoveryPagination,
  DiscoveryResultSummary,
} from "@/components/discovery/DiscoveryListChrome";
import { AppShell } from "@/components/layout/AppShell";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";
import { requirePublisherAnyDiscoveryAccess } from "@/features/publisher-discovery/access";
import {
  getPublisherSavedAuthors,
  normalizePublisherFollowingFilters,
} from "@/features/publisher-discovery/author-saved-query";
import {
  PublisherCollectionFilterDesk,
  publisherCollectionReviewLabel,
} from "@/features/publisher-discovery/components/PublisherCollectionFilterDesk";
import { PublisherFavoriteWorksTable } from "@/features/publisher-discovery/components/PublisherFavoriteWorksTable";
import { PublisherSavedAuthorsTable } from "@/features/publisher-discovery/components/PublisherSavedAuthorsTable";
import { publisherCollectionWordCountLabel } from "@/features/publisher-discovery/favorites-query";
import {
  getPublisherFavoriteWorks,
  normalizePublisherFavoriteFilters,
} from "@/features/publisher-discovery/work-favorites-query";
import {
  getAdultContentAccess,
  visibleMemberContentRatings,
} from "@/lib/adult-content-access";
import { sanitizeDiscoveryAdvancedFilters } from "@/lib/discovery-advanced-filter-management";
import {
  appendDiscoveryAdvancedFilterParams,
  clearDiscoveryAdvancedFilter,
  discoveryAdvancedFilterChips,
  type DiscoveryAdvancedFilters,
} from "@/lib/discovery-advanced-filters";
import { getDiscoverySurfaceFilterIds } from "@/lib/discovery-filter-config";
import type { DiscoveryFilterId } from "@/lib/discovery-filter-registry";
import { DISCOVERY_PAGE_SIZE } from "@/lib/discovery-list-standard";
import { workContentRatingDetails } from "@/lib/work-content-classification";
import "@/features/publisher-discovery/publisher-discovery.css";

export const metadata: Metadata = {
  description: "Yayınevinizin favorilediği public eserleri ve yazarları listeleyin.",
  title: "Yayınevi Favorilerim | İlkOku",
};

export const dynamic = "force-dynamic";

type CollectionType = "author" | "work";

type CollectionHrefInput = {
  advanced: DiscoveryAdvancedFilters;
  city?: string;
  contentRating?: string;
  genre?: string;
  language?: string;
  page: number;
  query?: string;
  reviewStatus?: string;
  type: CollectionType;
  wordCount?: string;
};

function firstValue(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function pageHref(input: CollectionHrefInput) {
  const params = new URLSearchParams();
  if (input.type === "author") params.set("tip", "yazar");
  if (input.query) params.set("arama", input.query);
  if (input.genre) params.set("tur", input.genre);
  if (input.contentRating) params.set("hitap", input.contentRating);
  if (input.type === "work" && input.reviewStatus) params.set("editor", input.reviewStatus);
  if (input.type === "work" && input.language) params.set("dil", input.language);
  if (input.type === "work" && input.wordCount) params.set("kelime", input.wordCount);
  if (input.type === "author" && input.city) params.set("sehir", input.city);
  appendDiscoveryAdvancedFilterParams(params, input.advanced);
  if (input.page > 1) params.set("sayfa", String(input.page));
  const query = params.toString();
  return query ? `/yayinevi/favorilerim?${query}` : "/yayinevi/favorilerim";
}

export default async function PublisherFavoritesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await requirePublisherAnyDiscoveryAccess(
    "/yayinevi/favorilerim",
    ["favorite_work", "favorite_author"],
  );
  const adultAccess = access.profile.adminPublisherView
    ? { canAccessAdultContent: true, isAdult: true }
    : await getAdultContentAccess(access.profile.id);
  const visibleRatings = visibleMemberContentRatings(adultAccess.canAccessAdultContent);
  const params = await searchParams;
  const canWork = access.permissions.includes("favorite_work");
  const canAuthor = access.permissions.includes("favorite_author");
  const requestedType = firstValue(params.tip) === "yazar" ? "author" : "work";
  const type: CollectionType =
    requestedType === "author" && canAuthor
      ? "author"
      : canWork
        ? "work"
        : "author";
  const surfaceId = type === "work" ? "publisher-favorite-works" : "publisher-favorite-authors";
  const enabledFilterIds = new Set<DiscoveryFilterId>(
    await getDiscoverySurfaceFilterIds(surfaceId),
  );
  const canMutate = !access.profile.adminPublisherView;
  const canViewPassport = access.permissions.includes("view_authorized_passport");

  const workFilters = normalizePublisherFavoriteFilters(params);
  if (!enabledFilterIds.has("search")) workFilters.query = "";
  if (!enabledFilterIds.has("genre")) workFilters.genre = "";
  if (!enabledFilterIds.has("contentRating")) workFilters.contentRating = undefined;
  if (!enabledFilterIds.has("reviewStatus")) workFilters.reviewStatus = undefined;
  if (!enabledFilterIds.has("language")) workFilters.language = "";
  if (!enabledFilterIds.has("wordCount")) workFilters.wordCount = undefined;
  workFilters.advanced = sanitizeDiscoveryAdvancedFilters(
    workFilters.advanced,
    enabledFilterIds,
  );
  if (workFilters.contentRating === "adult_18" && !adultAccess.canAccessAdultContent) {
    workFilters.contentRating = undefined;
  }

  const authorFilters = normalizePublisherFollowingFilters(params);
  if (!enabledFilterIds.has("search")) authorFilters.query = "";
  if (!enabledFilterIds.has("genre")) authorFilters.genre = "";
  if (!enabledFilterIds.has("contentRating")) authorFilters.contentRating = undefined;
  if (!enabledFilterIds.has("city")) authorFilters.city = "";
  authorFilters.advanced = sanitizeDiscoveryAdvancedFilters(
    authorFilters.advanced,
    enabledFilterIds,
  );
  if (authorFilters.contentRating === "adult_18" && !adultAccess.canAccessAdultContent) {
    authorFilters.contentRating = undefined;
  }

  const workData =
    type === "work"
      ? await getPublisherFavoriteWorks(
          access.publisherId,
          workFilters,
          adultAccess.canAccessAdultContent,
        )
      : null;
  const authorData =
    type === "author"
      ? await getPublisherSavedAuthors(
          access.publisherId,
          authorFilters,
          "favorite",
          adultAccess.canAccessAdultContent,
        )
      : null;
  const data = workData ?? authorData;
  if (!data) throw new Error("FAVORI_LISTESI_HAZIRLANAMADI");

  const hrefInput: CollectionHrefInput =
    type === "work"
      ? {
          advanced: workFilters.advanced,
          contentRating: workFilters.contentRating,
          genre: workFilters.genre,
          language: workFilters.language,
          page: data.currentPage,
          query: workFilters.query,
          reviewStatus: workFilters.reviewStatus,
          type,
          wordCount: workFilters.wordCount,
        }
      : {
          advanced: authorFilters.advanced,
          city: authorFilters.city,
          contentRating: authorFilters.contentRating,
          genre: authorFilters.genre,
          page: data.currentPage,
          query: authorFilters.query,
          type,
        };
  const returnTo = pageHref(hrefInput);
  const baseActiveFilters = [
    hrefInput.query
      ? {
          href: pageHref({ ...hrefInput, page: 1, query: undefined }),
          label: `Arama: ${hrefInput.query}`,
        }
      : null,
    hrefInput.genre
      ? {
          href: pageHref({ ...hrefInput, genre: undefined, page: 1 }),
          label: `Tür: ${hrefInput.genre}`,
        }
      : null,
    hrefInput.contentRating
      ? {
          href: pageHref({ ...hrefInput, contentRating: undefined, page: 1 }),
          label: `Yaş: ${workContentRatingDetails[hrefInput.contentRating as keyof typeof workContentRatingDetails].shortLabel}`,
        }
      : null,
    type === "work" && workFilters.reviewStatus
      ? {
          href: pageHref({ ...hrefInput, page: 1, reviewStatus: undefined }),
          label: `Editör: ${publisherCollectionReviewLabel(workFilters.reviewStatus)}`,
        }
      : null,
    type === "work" && workFilters.language
      ? {
          href: pageHref({ ...hrefInput, language: undefined, page: 1 }),
          label: `Dil: ${workFilters.language === "tr" ? "Türkçe" : workFilters.language === "en" ? "İngilizce" : workFilters.language.toLocaleUpperCase("tr-TR")}`,
        }
      : null,
    type === "work" && workFilters.wordCount
      ? {
          href: pageHref({ ...hrefInput, page: 1, wordCount: undefined }),
          label: `Kelime: ${publisherCollectionWordCountLabel(workFilters.wordCount)}`,
        }
      : null,
    type === "author" && authorFilters.city
      ? {
          href: pageHref({ ...hrefInput, city: undefined, page: 1 }),
          label: `Şehir: ${authorFilters.city}`,
        }
      : null,
  ].filter((item): item is { href: string; label: string } => item !== null);
  const advancedActiveFilters = discoveryAdvancedFilterChips(
    hrefInput.advanced,
    enabledFilterIds,
  ).map((item) => ({
    href: pageHref({
      ...hrefInput,
      advanced: clearDiscoveryAdvancedFilter(hrefInput.advanced, item.id),
      page: 1,
    }),
    label: item.label,
  }));
  const activeFilters = [...baseActiveFilters, ...advancedActiveFilters];
  const clearHref = type === "author" ? "/yayinevi/favorilerim?tip=yazar" : "/yayinevi/favorilerim";

  return (
    <AppShell profile={access.profile}>
      <div className="publisher-discovery">
        <EditorPageHeader
          description="Ortak Eser ve Yazar Havuzu'nda yayıneviniz adına favorilenen kayıtları yönetin."
          eyebrow={access.companyName}
          title="Favorilerim"
        />

        <nav className="publisher-discovery-filter-actions" aria-label="Favori türü">
          {canWork ? (
            <Link className={type === "work" ? "button button--primary" : "button button--ghost"} href="/yayinevi/favorilerim">
              Eserler
            </Link>
          ) : null}
          {canAuthor ? (
            <Link className={type === "author" ? "button button--primary" : "button button--ghost"} href="/yayinevi/favorilerim?tip=yazar">
              Yazarlar
            </Link>
          ) : null}
        </nav>

        <PublisherCollectionFilterDesk
          activeFilters={activeFilters}
          advancedFilters={hrefInput.advanced}
          city={type === "author" ? authorFilters.city : undefined}
          clearHref={clearHref}
          contentRating={hrefInput.contentRating}
          genre={hrefInput.genre}
          heading={type === "work" ? "Favori eserleri daraltın" : "Favori yazarları daraltın"}
          hiddenFields={type === "author" ? [{ name: "tip", value: "yazar" }] : []}
          hint={type === "work" ? "Tüm favori eserleri görüyorsunuz." : "Tüm favori yazarları görüyorsunuz."}
          kind={type}
          language={type === "work" ? workFilters.language : undefined}
          query={hrefInput.query}
          ratingOptions={visibleRatings}
          reviewStatus={type === "work" ? workFilters.reviewStatus : undefined}
          wordCount={type === "work" ? workFilters.wordCount : undefined}
        />

        <DiscoveryResultSummary
          currentPage={data.currentPage}
          noun={type === "work" ? "eser" : "yazar"}
          pageSize={DISCOVERY_PAGE_SIZE}
          totalCount={data.totalCount}
          visibleCount={data.rows.length}
        />

        {data.rows.length === 0 ? (
          <section className="publisher-discovery-empty">
            <h2>Eşleşen favori bulunmuyor</h2>
            <p>Filtreleri değiştirin veya Keşfet ekranından yeni bir kayıt favorileyin.</p>
            <Link className="button button--primary" href={type === "work" ? "/yayinevi/kesfet/eserler" : "/yayinevi/kesfet/yazarlar"}>
              Keşfe git
            </Link>
          </section>
        ) : workData ? (
          <PublisherFavoriteWorksTable
            canMutate={canMutate}
            canViewPassport={canViewPassport}
            returnTo={returnTo}
            rows={workData.rows}
          />
        ) : authorData ? (
          <PublisherSavedAuthorsTable
            canMutate={canMutate}
            mode="favorite"
            returnTo={returnTo}
            rows={authorData.rows}
          />
        ) : null}

        <DiscoveryPagination
          ariaLabel="Yayınevi favori sayfalama"
          currentPage={data.currentPage}
          hrefForPage={(page) => pageHref({ ...hrefInput, page })}
          totalPages={data.totalPages}
        />
      </div>
    </AppShell>
  );
}
