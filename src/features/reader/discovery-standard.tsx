import Link from "next/link";

import {
  DiscoveryResultSummary,
} from "@/components/discovery/DiscoveryListChrome";
import "@/components/discovery/discovery-filter-desk.css";
import type { ReaderWorkRow } from "@/features/reader/components/ReaderWorksTable";
import { getDiscoverySurfaceFilterIds } from "@/lib/discovery-filter-config";
import { DISCOVERY_PAGE_SIZE } from "@/lib/discovery-list-standard";
import { normalizeGenreLabel } from "@/lib/genre-system";
import { GENRE_LABELS } from "@/lib/genres";
import {
  workContentRatingDetails,
  type StoredWorkContentRating,
} from "@/lib/work-content-classification";

export { DiscoveryPagination as ReaderPagination } from "@/components/discovery/DiscoveryListChrome";

export const READER_LIST_PAGE_SIZE = DISCOVERY_PAGE_SIZE;

export const readerReviewFilters = [
  "not_requested",
  "requested",
  "in_progress",
  "awaiting_second_editor",
  "second_in_progress",
  "completed",
] as const;

export type ReaderReviewFilter = (typeof readerReviewFilters)[number];

export type ReaderActiveFilter = {
  href: string;
  label: string;
};

export type ReaderSortOption = {
  label: string;
  value: string;
};

export type ReaderStandardFilters = {
  contentRating?: StoredWorkContentRating;
  genre?: string;
  page: number;
  reviewStatus?: ReaderReviewFilter;
  search?: string;
  sort: string;
};

export function includesReaderFilter<T extends string>(
  values: readonly T[],
  value: string | undefined,
): value is T {
  return Boolean(value && values.includes(value as T));
}

export function readerReviewLabel(status: ReaderReviewFilter) {
  switch (status) {
    case "not_requested":
      return "Henüz incelenmedi";
    case "requested":
      return "İnceleme talep edildi";
    case "in_progress":
      return "İlk editörde";
    case "awaiting_second_editor":
      return "İkinci editör bekleniyor";
    case "second_in_progress":
      return "İkinci editörde";
    case "completed":
      return "İncelendi";
  }
}

export function parseReaderStandardFilters(
  params: {
    arama?: string;
    editor?: string;
    hitapYasi?: string;
    sayfa?: string;
    siralama?: string;
    tur?: string;
  },
  ratingOptions: readonly StoredWorkContentRating[],
  sortOptions: readonly ReaderSortOption[],
  defaultSort: string,
): ReaderStandardFilters {
  const search = params.arama?.trim().slice(0, 220) || undefined;
  const genre = normalizeGenreLabel(params.tur);
  const contentRating =
    params.hitapYasi &&
    ratingOptions.includes(params.hitapYasi as StoredWorkContentRating)
      ? (params.hitapYasi as StoredWorkContentRating)
      : undefined;
  const reviewStatus = includesReaderFilter(readerReviewFilters, params.editor)
    ? params.editor
    : undefined;
  const sort = sortOptions.some((option) => option.value === params.siralama)
    ? (params.siralama as string)
    : defaultSort;
  const rawPage = Number.parseInt(params.sayfa ?? "", 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  return {
    contentRating,
    genre,
    page,
    reviewStatus,
    search,
    sort,
  };
}

export function readerListHref(
  basePath: string,
  filters: ReaderStandardFilters,
  page: number,
  fixedParams: Record<string, string> = {},
) {
  const params = new URLSearchParams(fixedParams);

  if (filters.search) params.set("arama", filters.search);
  if (filters.genre) params.set("tur", filters.genre);
  if (filters.contentRating) params.set("hitapYasi", filters.contentRating);
  if (filters.reviewStatus) params.set("editor", filters.reviewStatus);
  if (filters.sort) params.set("siralama", filters.sort);
  if (page > 1) params.set("sayfa", String(page));

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function readerWorkMatches(
  work: ReaderWorkRow,
  filters: Pick<
    ReaderStandardFilters,
    "contentRating" | "genre" | "reviewStatus" | "search"
  >,
) {
  if (filters.search) {
    const needle = filters.search.toLocaleLowerCase("tr-TR");
    const values = [work.title, work.authorName, work.authorUsername];
    if (
      !values.some((value) =>
        value?.toLocaleLowerCase("tr-TR").includes(needle),
      )
    ) {
      return false;
    }
  }

  if (filters.genre && work.genre !== filters.genre) return false;
  if (filters.contentRating && work.contentRating !== filters.contentRating) {
    return false;
  }
  if (filters.reviewStatus && work.editorReviewStatus !== filters.reviewStatus) {
    return false;
  }

  return true;
}

function inferReaderSurfaceId(
  clearHref: string,
  hiddenFields: Array<{ name: string; value: string }>,
) {
  if (clearHref.startsWith("/yazar-kesfet")) return "reader-author-discovery";
  if (clearHref.startsWith("/okumaya-devam")) return "reader-continue-reading";
  if (clearHref.startsWith("/tamamlanan-eserler")) return "reader-completed-works";
  if (clearHref.startsWith("/favorilerim")) {
    return hiddenFields.some((field) => field.name === "tip" && field.value === "yazar")
      ? "reader-favorite-authors"
      : "reader-favorite-works";
  }
  return "reader-work-discovery";
}

export async function ReaderFilterDesk({
  activeFilters,
  clearHref,
  contentRating,
  genre,
  heading,
  hiddenFields = [],
  hint,
  ratingOptions,
  reviewStatus,
  search,
  searchPlaceholder,
  sort,
  sortOptions,
  surfaceId,
}: {
  activeFilters: ReaderActiveFilter[];
  clearHref: string;
  contentRating?: string;
  genre?: string;
  heading: string;
  hiddenFields?: Array<{ name: string; value: string }>;
  hint: string;
  ratingOptions: readonly StoredWorkContentRating[];
  reviewStatus?: ReaderReviewFilter;
  search?: string;
  searchPlaceholder: string;
  sort: string;
  sortOptions: readonly ReaderSortOption[];
  surfaceId?: string;
}) {
  const hasFilters = activeFilters.length > 0;
  const resolvedSurfaceId = surfaceId ?? inferReaderSurfaceId(clearHref, hiddenFields);
  const enabledFilterIds = new Set(await getDiscoverySurfaceFilterIds(resolvedSurfaceId));
  const hasManagedFields = enabledFilterIds.size > 0;

  return (
    <section aria-label="Filtre masası" className="role-filter-desk">
      <header className="role-filter-desk__header">
        <div>
          <span>Filtre masası</span>
          <strong>{heading}</strong>
        </div>
        {hasFilters ? <Link href={clearHref}>Tüm filtreleri temizle</Link> : null}
      </header>

      {hasManagedFields ? (
        <form className="role-filter-desk__form" method="get">
          {hiddenFields.map((field) => (
            <input key={field.name} name={field.name} type="hidden" value={field.value} />
          ))}

          {enabledFilterIds.has("search") ? (
            <label className="role-filter-field--search">
              <span>Arama</span>
              <input
                defaultValue={search}
                name="arama"
                placeholder={searchPlaceholder}
                type="search"
              />
            </label>
          ) : null}

          {enabledFilterIds.has("genre") ? (
            <label>
              <span>Tür</span>
              <select defaultValue={genre ?? ""} name="tur">
                <option value="">Tüm türler</option>
                {GENRE_LABELS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {enabledFilterIds.has("contentRating") ? (
            <label>
              <span>Hitap yaşı</span>
              <select defaultValue={contentRating ?? ""} name="hitapYasi">
                <option value="">Tümü</option>
                {ratingOptions.map((rating) => (
                  <option key={rating} value={rating}>
                    {workContentRatingDetails[rating].shortLabel}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {enabledFilterIds.has("reviewStatus") ? (
            <label>
              <span>Editör durumu</span>
              <select defaultValue={reviewStatus ?? ""} name="editor">
                <option value="">Tümü</option>
                <option value="not_requested">Henüz incelenmedi</option>
                <option value="requested">İnceleme talep edildi</option>
                <option value="in_progress">İlk editörde</option>
                <option value="awaiting_second_editor">İkinci editör bekleniyor</option>
                <option value="second_in_progress">İkinci editörde</option>
                <option value="completed">İncelendi</option>
              </select>
            </label>
          ) : null}

          {enabledFilterIds.has("sort") ? (
            <label>
              <span>Sıralama</span>
              <select defaultValue={sort} name="siralama">
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <div className="role-filter-desk__actions">
            <button className="button button--primary" type="submit">
              Masayı Güncelle
            </button>
            {hasFilters ? (
              <Link className="button button--ghost" href={clearHref}>
                Temizle
              </Link>
            ) : null}
          </div>
        </form>
      ) : (
        <p className="role-filter-desk__hint">
          Bu yüzeyde Filtre Masası alanları İçerik Yönetimi&apos;nden kapatıldı.
        </p>
      )}

      {hasFilters ? (
        <div aria-label="Aktif filtreler" className="role-filter-desk__active">
          <span>Aktif</span>
          {activeFilters.map((item) => (
            <Link href={item.href} key={`${item.label}-${item.href}`}>
              {item.label}
              <b aria-hidden="true">×</b>
            </Link>
          ))}
        </div>
      ) : hasManagedFields ? (
        <p className="role-filter-desk__hint">{hint}</p>
      ) : null}
    </section>
  );
}

export function ReaderResultSummary({
  currentPage,
  pageSize = READER_LIST_PAGE_SIZE,
  totalCount,
  visibleCount,
  noun,
}: {
  currentPage: number;
  pageSize?: number;
  totalCount: number;
  visibleCount: number;
  noun: string;
}) {
  return (
    <DiscoveryResultSummary
      currentPage={currentPage}
      noun={noun}
      pageSize={pageSize}
      totalCount={totalCount}
      visibleCount={visibleCount}
    />
  );
}
