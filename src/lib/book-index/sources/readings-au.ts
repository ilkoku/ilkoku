import type {
  BookIndexCollectionContext,
  BookIndexCollectionResult,
  BookIndexSourceAdapter,
} from "../adapter";
import { decodeBookIndexHtml } from "../html";

const SOURCE_CODE = "readings-au";
const SOURCE_ORIGIN = "https://www.readings.com.au";
const EXPECTED_BOOKS = 20;
const FALLBACK_DISCOVERY_URL =
  "https://www.readings.com.au/news/categories/non-fiction";

function absoluteUrl(value: string) {
  return new URL(value, SOURCE_ORIGIN).toString();
}

function normalizeText(value: string | undefined) {
  return decodeBookIndexHtml(value ?? "")
    .replace(/<[^>]+>/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function monthlyBestsellerHref(html: string) {
  const links = [
    ...html.matchAll(
      /<a\b[^>]*href=["']([^"']*\/news\/our-[a-z]+-20\d{2}-bestsellers)["'][^>]*>/giu,
    ),
  ]
    .map((match) => match[1])
    .filter(Boolean);

  const unique = [...new Set(links)];
  return unique[0] ?? null;
}

export function discoverReadingsMonthlyBestsellerUrl(
  html: string,
): string | null {
  const href = monthlyBestsellerHref(html);
  return href ? absoluteUrl(href) : null;
}

export function parseReadingsAustraliaMonthlyBestsellers(
  html: string,
): BookIndexCollectionResult {
  const rows = [];

  for (const match of html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/giu)) {
    const paragraph = match[1] ?? "";
    const rankMatch = paragraph.match(
      /^\s*<strong\b[^>]*>\s*([1-9]|1[0-9]|20)\.\s*<\/strong>/iu,
    );
    if (!rankMatch) continue;

    const productMatch = paragraph.match(
      /<a\b[^>]*href=["']([^"']*\/product\/((?:978|979)[0-9]{10})\/[^"']*)["'][^>]*>([\s\S]*?)<\/a>/iu,
    );
    if (!productMatch) {
      throw new Error("BOOK_INDEX_READINGS_AU_INVALID_ITEM");
    }

    const rank = Number(rankMatch[1]);
    const productUrl = absoluteUrl(productMatch[1]);
    const isbn13 = productMatch[2];
    const title = normalizeText(productMatch[3]);

    const visible = normalizeText(paragraph);
    const authorMatch = visible.match(
      /^\d+\.\s*.*?\s+by\s+(.+?)\s*$/iu,
    );
    const authorName = authorMatch?.[1]?.trim() ?? "";

    if (
      !Number.isInteger(rank)
      || !isbn13
      || !title
      || !authorName
    ) {
      throw new Error("BOOK_INDEX_READINGS_AU_INVALID_ITEM");
    }

    rows.push({
      sourceKey: isbn13,
      sourceExternalId: isbn13,
      title,
      authorName,
      publisherName: null,
      isbn13,
      productUrl,
      imageUrl: null,
      rank,
      currency: "AUD",
    });
  }

  rows.sort((left, right) => left.rank - right.rank);

  if (rows.length !== EXPECTED_BOOKS) {
    throw new Error(
      `BOOK_INDEX_READINGS_AU_RESULT_SIZE_MISMATCH:${rows.length}`,
    );
  }

  if (rows.some((book, index) => book.rank !== index + 1)) {
    throw new Error("BOOK_INDEX_READINGS_AU_RANK_ORDER_MISMATCH");
  }

  const sourceKeys = new Set(rows.map((book) => book.sourceKey));
  if (sourceKeys.size !== rows.length) {
    throw new Error("BOOK_INDEX_READINGS_AU_DUPLICATE_ISBN");
  }

  return { books: rows };
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-AU,en;q=0.9",
      "User-Agent": "IlkOkuBookIndex/0.1 (+https://ilkoku.com)",
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`BOOK_INDEX_SOURCE_HTTP_${response.status}`);
  }

  return decodeBookIndexHtml(await response.text());
}

async function discoverLatestArticle(primaryUrl: string) {
  const primaryHtml = await fetchHtml(primaryUrl);
  const primary = discoverReadingsMonthlyBestsellerUrl(primaryHtml);
  if (primary) return primary;

  const fallbackHtml = await fetchHtml(FALLBACK_DISCOVERY_URL);
  const fallback = discoverReadingsMonthlyBestsellerUrl(fallbackHtml);
  if (fallback) return fallback;

  throw new Error("BOOK_INDEX_READINGS_AU_ARTICLE_NOT_FOUND");
}

export const readingsAustraliaBookIndexAdapter: BookIndexSourceAdapter = {
  sourceCode: SOURCE_CODE,
  async collect(
    context: BookIndexCollectionContext,
  ): Promise<BookIndexCollectionResult> {
    if (context.listCode !== "readings-au-monthly") {
      throw new Error("BOOK_INDEX_READINGS_AU_LIST_NOT_SUPPORTED");
    }

    const articleUrl = await discoverLatestArticle(context.sourceUrl);
    return parseReadingsAustraliaMonthlyBestsellers(
      await fetchHtml(articleUrl),
    );
  },
};
