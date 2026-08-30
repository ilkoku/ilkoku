import Link from "next/link";
import type { ReactNode } from "react";

import "@/components/discovery/discovery-filter-desk.css";
import { GENRE_LABELS } from "@/lib/genres";
import {
  workContentRatingDetails,
  type StoredWorkContentRating,
} from "@/lib/work-content-classification";

export const READER_LIST_PAGE_SIZE = 24;

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

export function ReaderFilterDesk({
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
}) {
  const hasFilters = activeFilters.length > 0;

  return (
    <section aria-label="Filtre masası" className="role-filter-desk">
      <header className="role-filter-desk__header">
        <div>
          <span>Filtre masası</span>
          <strong>{heading}</strong>
        </div>
        {hasFilters ? <Link href={clearHref}>Tüm filtreleri temizle</Link> : null}
      </header>

      <form className="role-filter-desk__form" method="get">
        {hiddenFields.map((field) => (
          <input key={field.name} name={field.name} type="hidden" value={field.value} />
        ))}

        <label className="role-filter-field--search">
          <span>Arama</span>
          <input
            defaultValue={search}
            name="arama"
            placeholder={searchPlaceholder}
            type="search"
          />
        </label>

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
      ) : (
        <p className="role-filter-desk__hint">{hint}</p>
      )}
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
  const first = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const last = totalCount === 0 ? 0 : first + visibleCount - 1;

  return (
    <section aria-live="polite" className="role-filter-result">
      <span>Masadaki sonuç</span>
      <strong>
        {totalCount} {noun}
      </strong>
      {totalCount > 0 ? <small>{first}–{last} arası gösteriliyor.</small> : null}
    </section>
  );
}

function paginationWindow(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([
    1,
    totalPages,
    currentPage,
    currentPage - 1,
    currentPage + 1,
  ]);

  return [...pages]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((left, right) => left - right);
}

export function ReaderPagination({
  ariaLabel,
  currentPage,
  hrefForPage,
  totalPages,
}: {
  ariaLabel: string;
  currentPage: number;
  hrefForPage: (page: number) => string;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  const pages = paginationWindow(currentPage, totalPages);
  const nodes: ReactNode[] = [];
  let previousPage = 0;

  for (const page of pages) {
    if (previousPage && page - previousPage > 1) {
      nodes.push(
        <span aria-hidden="true" className="role-filter-pagination__ellipsis" key={`gap-${page}`}>
          …
        </span>,
      );
    }

    nodes.push(
      <Link
        aria-current={page === currentPage ? "page" : undefined}
        className="role-filter-pagination__page"
        href={hrefForPage(page)}
        key={page}
      >
        {page}
      </Link>,
    );
    previousPage = page;
  }

  return (
    <footer aria-label={ariaLabel} className="role-filter-pagination">
      <span>
        Sayfa {currentPage} / {totalPages}
      </span>
      <nav aria-label="Sayfalar">
        {currentPage > 1 ? (
          <Link className="button button--ghost" href={hrefForPage(currentPage - 1)}>
            Önceki
          </Link>
        ) : (
          <span aria-disabled="true">Önceki</span>
        )}

        <div className="role-filter-pagination__pages">{nodes}</div>

        {currentPage < totalPages ? (
          <Link className="button button--ghost" href={hrefForPage(currentPage + 1)}>
            Sonraki
          </Link>
        ) : (
          <span aria-disabled="true">Sonraki</span>
        )}
      </nav>
    </footer>
  );
}
