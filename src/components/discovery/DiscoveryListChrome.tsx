import Link from "next/link";
import type { ReactNode } from "react";

import "./discovery-filter-desk.css";

export function DiscoveryResultSummary({
  currentPage,
  noun,
  pageSize,
  totalCount,
  visibleCount,
}: {
  currentPage: number;
  noun: string;
  pageSize: number;
  totalCount: number;
  visibleCount: number;
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

export function DiscoveryPagination({
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
        <span
          aria-hidden="true"
          className="role-filter-pagination__ellipsis"
          key={`gap-${page}`}
        >
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
