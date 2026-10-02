import type {
  BookIndexCollectionContext,
  BookIndexCollectionResult,
  BookIndexSourceAdapter,
} from "../adapter";
import { decodeBookIndexHtml } from "../html";

const SOURCE_CODE = "ibs-it";
const SOURCE_ORIGIN = "https://www.ibs.it";
const EXPECTED_BOOKS = 40;
const MAX_DETAIL_AUTHOR_LOOKUPS = 4;

function absoluteUrl(value: string) {
  return new URL(value, SOURCE_ORIGIN).toString();
}

function normalizeText(value: string | undefined) {
  return decodeBookIndexHtml(value ?? "").replace(/\s+/gu, " ").trim();
}

export function parseIbsItalyProductAuthor(
  html: string,
  productTitle: string,
): string | null {
  const pageTitle = normalizeText(
    html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/iu)?.[1],
  );
  if (!pageTitle) return null;

  const bookMarker = " - Libro - ";
  const markerIndex = pageTitle.lastIndexOf(bookMarker);
  const expectedPrefix = `${productTitle} - `;

  if (!pageTitle.startsWith(expectedPrefix) || markerIndex <= expectedPrefix.length) {
    return null;
  }

  const authorSegment = pageTitle
    .slice(expectedPrefix.length, markerIndex)
    .trim();
  if (!authorSegment) return null;

  const authors = authorSegment
    .split(/\s+-\s+/u)
    .map((author) => author.trim())
    .filter(Boolean);

  return authors.length > 0 ? authors.join("; ") : null;
}

function parseCard(
  card: string,
): BookIndexCollectionResult["books"][number] | null {
  if (
    !card.includes('data-list="Classifica Libri - 1day"')
    && !card.includes("data-list='Classifica Libri - 1day'")
  ) {
    return null;
  }

  const rankValue =
    card.match(
      /<[^>]*class=["'][^"']*\bcc-position\b[^"']*["'][^>]*>\s*([1-9][0-9]{0,2})\s*</iu,
    )?.[1]
    ?? card.match(
      /<[^>]*class=["'][^"']*\bcc-ranking-position\b[^"']*["'][^>]*>[\s\S]*?([1-9][0-9]{0,2})/iu,
    )?.[1];

  const productAnchor =
    card.match(
      /<a\b[^>]*href=["']([^"']+\/e\/((?:978|979)[0-9]{10})(?:\?[^"']*)?)["'][^>]*data-ean=["']\2["'][^>]*data-list=["']Classifica Libri - 1day["'][^>]*>([\s\S]*?)<\/a>/iu,
    )
    ?? card.match(
      /<a\b(?=[^>]*data-ean=["']((?:978|979)[0-9]{10})["'])(?=[^>]*data-list=["']Classifica Libri - 1day["'])[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/iu,
    );

  if (!rankValue || !productAnchor) {
    throw new Error("BOOK_INDEX_IBS_IT_INVALID_ITEM");
  }

  const firstPattern = /\/e\/((?:978|979)[0-9]{10})/u.test(productAnchor[1] ?? "");
  const isbn13 = firstPattern ? productAnchor[2] : productAnchor[1];
  const href = firstPattern ? productAnchor[1] : productAnchor[2];
  const titleHtml = productAnchor[3];
  const authorHtml = card.match(
    /<a\b[^>]*class=["'][^"']*\bcc-author-name\b[^"']*["'][^>]*>([\s\S]*?)<\/a>/iu,
  )?.[1];
  const imageValue = card.match(
    /<img\b[^>]*(?:src|data-src)=["']([^"']+)["'][^>]*>/iu,
  )?.[1];

  const rank = Number(rankValue);
  const title = normalizeText(titleHtml);
  const authorName = normalizeText(authorHtml) || null;

  if (
    !Number.isInteger(rank)
    || rank < 1
    || !isbn13
    || !href
    || !title
  ) {
    throw new Error("BOOK_INDEX_IBS_IT_INVALID_ITEM");
  }

  return {
    sourceKey: isbn13,
    sourceExternalId: isbn13,
    title,
    authorName,
    publisherName: null,
    isbn13,
    productUrl: absoluteUrl(href),
    imageUrl: imageValue ? absoluteUrl(imageValue) : null,
    rank,
    currency: "EUR",
  };
}

async function enrichMissingIbsAuthors(
  result: BookIndexCollectionResult,
): Promise<BookIndexCollectionResult> {
  const missingAuthorBooks = result.books.filter((book) => !book.authorName);
  if (missingAuthorBooks.length === 0) return result;

  if (missingAuthorBooks.length > MAX_DETAIL_AUTHOR_LOOKUPS) {
    throw new Error(
      `BOOK_INDEX_IBS_IT_TOO_MANY_MISSING_AUTHORS:${missingAuthorBooks.length}`,
    );
  }

  const enrichedAuthors = new Map<string, string>();

  for (const book of missingAuthorBooks) {
    const detailHtml = await fetchHtml(book.productUrl);
    const authorName = parseIbsItalyProductAuthor(detailHtml, book.title);

    if (!authorName) {
      throw new Error(
        `BOOK_INDEX_IBS_IT_AUTHOR_ENRICHMENT_MISSING:${book.sourceKey}`,
      );
    }

    enrichedAuthors.set(book.sourceKey, authorName);
  }

  return {
    ...result,
    books: result.books.map((book) => ({
      ...book,
      authorName:
        book.authorName
        ?? enrichedAuthors.get(book.sourceKey)
        ?? null,
    })),
  };
}

export function parseIbsItalyDailyBestsellers(
  html: string,
): BookIndexCollectionResult {
  const starts = [
    ...html.matchAll(
      /<(?:div|li)\b[^>]*class=["'][^"']*\bcc-product-list-item\b[^"']*\bcc-product-list-item--ranking\b[^"']*["'][^>]*>/giu,
    ),
  ];

  const books = [];

  for (let index = 0; index < starts.length; index += 1) {
    const match = starts[index];
    const start = match.index ?? 0;
    const end =
      starts[index + 1]?.index
      ?? Math.min(html.length, start + 30_000);
    const parsed = parseCard(html.slice(start, end));
    if (parsed) books.push(parsed);
  }

  if (books.length !== EXPECTED_BOOKS) {
    throw new Error(
      `BOOK_INDEX_IBS_IT_RESULT_SIZE_MISMATCH:${books.length}`,
    );
  }

  if (books.some((book, index) => book.rank !== index + 1)) {
    throw new Error("BOOK_INDEX_IBS_IT_RANK_ORDER_MISMATCH");
  }

  const sourceKeys = new Set(books.map((book) => book.sourceKey));
  if (sourceKeys.size !== books.length) {
    throw new Error("BOOK_INDEX_IBS_IT_DUPLICATE_ISBN");
  }

  return { books };
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "it-IT,it;q=0.9,en;q=0.6",
      "User-Agent": "IlkOkuBookIndex/0.1 (+https://ilkoku.com)",
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`BOOK_INDEX_SOURCE_HTTP_${response.status}`);
  }

  return response.text();
}

export const ibsItalyBookIndexAdapter: BookIndexSourceAdapter = {
  sourceCode: SOURCE_CODE,
  async collect(
    context: BookIndexCollectionContext,
  ): Promise<BookIndexCollectionResult> {
    if (context.listCode !== "ibs-it-daily") {
      throw new Error("BOOK_INDEX_IBS_IT_LIST_NOT_SUPPORTED");
    }

    return enrichMissingIbsAuthors(
      parseIbsItalyDailyBestsellers(
        await fetchHtml(context.sourceUrl),
      ),
    );
  },
};
