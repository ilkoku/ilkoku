export const READING_WORDS_PER_MINUTE = 200;
export const ESTIMATED_BOOK_PAGE_WORDS = 280;

export function countReadingWords(content: string) {
  const normalized = content.trim();
  return normalized ? normalized.split(/\s+/u).length : 0;
}

export function estimateReadingMinutes(content: string) {
  const words = countReadingWords(content);
  return words > 0
    ? Math.max(1, Math.ceil(words / READING_WORDS_PER_MINUTE))
    : 0;
}

export function estimateBookPageCount(content: string) {
  const words = countReadingWords(content);
  return words > 0
    ? Math.max(1, Math.ceil(words / ESTIMATED_BOOK_PAGE_WORDS))
    : 0;
}

export function getEstimatedBookPageRange<
  T extends { content: string; id: string },
>(chapters: T[], activeChapterId: string) {
  let nextPage = 1;
  let activeStartPage = 1;
  let activeEndPage = 1;

  for (const chapter of chapters) {
    const pageCount = estimateBookPageCount(chapter.content);
    const startPage = nextPage;
    const endPage = pageCount > 0
      ? startPage + pageCount - 1
      : startPage;

    if (chapter.id === activeChapterId) {
      activeStartPage = startPage;
      activeEndPage = endPage;
    }

    nextPage = endPage + 1;
  }

  return {
    endPage: activeEndPage,
    startPage: activeStartPage,
    totalPages: Math.max(1, nextPage - 1),
  };
}

export function formatEstimatedBookPageRange({
  endPage,
  startPage,
  totalPages,
}: {
  endPage: number;
  startPage: number;
  totalPages: number;
}) {
  const currentRange =
    startPage === endPage
      ? `${startPage}`
      : `${startPage}–${endPage}`;

  return `≈ kitap s. ${currentRange} / ${totalPages}`;
}
