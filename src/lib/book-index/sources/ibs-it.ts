import type {
  BookIndexCollectionContext,
  BookIndexCollectionResult,
  BookIndexSourceAdapter,
} from "../adapter";
import { decodeBookIndexHtml } from "../html";

const SOURCE_CODE = "ibs-it";
const SOURCE_ORIGIN = "https://www.ibs.it";
const EXPECTED_BOOKS = 40;

function absoluteUrl(value: string) {
  return new URL(value, SOURCE_ORIGIN).toString();
}

function normalizeText(value: string | undefined) {
  return decodeBookIndexHtml(value ?? "").replace(/\s+/gu, " ").trim();
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
  const authorName = normalizeText(authorHtml);

  if (
    !Number.isInteger(rank)
    || rank < 1
    || !isbn13
    || !href
    || !title
    || !authorName
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

    return parseIbsItalyDailyBestsellers(
      await fetchHtml(context.sourceUrl),
    );
  },
};
