import type {
  BookIndexCollectionContext,
  BookIndexCollectionResult,
  BookIndexSourceAdapter,
} from "../adapter";
import { decodeBookIndexHtml, normalizeBookIndexText } from "../html";

const SOURCE_CODE = "sbvv-ch";
const EXPECTED_BOOKS = 20;

function htmlToVisibleLines(html: string) {
  return html
    .replace(/<!--[\s\S]*?-->/gu, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, " ")
    .replace(/<br\s*\/?\s*>/giu, "\n")
    .replace(/<\/(?:p|div|li|h[1-6]|section|article|ol|ul)>/giu, "\n")
    .replace(/<[^>]+>/gu, " ")
    .split(/\n+/u)
    .map((line) => decodeBookIndexHtml(line).replace(/\s+/gu, " ").trim())
    .filter(Boolean);
}

function stripPreviousRankMarker(value: string) {
  return value
    .replace(/^\((?:N|W|\d+)\)\s*/iu, "")
    .replace(/^(?:NEU|WE)\s+/iu, "")
    .trim();
}

export function parseSwitzerlandSbvvFictionHardcover(
  html: string,
  sourceUrl: string,
): BookIndexCollectionResult {
  const lines = htmlToVisibleLines(html);
  const headingIndex = lines.findIndex((line) =>
    normalizeBookIndexText(line).startsWith("bestseller der woche"),
  );
  if (headingIndex < 0) {
    throw new Error("BOOK_INDEX_SBV_CH_WEEKLY_HEADING_NOT_FOUND");
  }

  if (
    !lines.some(
      (line) =>
        normalizeBookIndexText(line) ===
        normalizeBookIndexText("Belletristik Hardcover"),
    )
  ) {
    throw new Error("BOOK_INDEX_SBV_CH_FICTION_HARDCOVER_ANCHOR_NOT_FOUND");
  }

  const books: BookIndexCollectionResult["books"] = [];

  for (let index = headingIndex + 1; index < lines.length; index += 1) {
    const metadata = lines[index]?.match(
      /^(.+?)\s*\/\s*(.+?)\s*\/\s*(97[89][0-9]{10})$/u,
    );
    if (!metadata) continue;

    const titleLine = lines[index - 1] ?? "";
    const title = stripPreviousRankMarker(titleLine);
    const authorName = metadata[1]?.trim() ?? "";
    const publisherName = metadata[2]?.trim() ?? "";
    const isbn13 = metadata[3] ?? "";

    if (!title || !authorName || !publisherName || !isbn13) {
      throw new Error(
        `BOOK_INDEX_SBV_CH_INVALID_ITEM:${books.length + 1}`,
      );
    }

    books.push({
      sourceKey: isbn13,
      sourceExternalId: isbn13,
      title,
      authorName,
      publisherName,
      isbn13,
      isbn10: null,
      productUrl: sourceUrl,
      imageUrl: null,
      rank: books.length + 1,
      currency: "CHF",
    });

    if (books.length === EXPECTED_BOOKS) break;
  }

  if (books.length !== EXPECTED_BOOKS) {
    throw new Error(
      `BOOK_INDEX_SBV_CH_RESULT_SIZE_MISMATCH:${books.length}`,
    );
  }

  if (books.some((book, index) => book.rank !== index + 1)) {
    throw new Error("BOOK_INDEX_SBV_CH_RANK_ORDER_MISMATCH");
  }

  const sourceKeys = new Set(books.map((book) => book.sourceKey));
  if (sourceKeys.size !== books.length) {
    throw new Error("BOOK_INDEX_SBV_CH_DUPLICATE_ISBN");
  }

  return { books };
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "de-CH,de;q=0.9,en;q=0.5",
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36",
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`BOOK_INDEX_SOURCE_HTTP_${response.status}`);
  }

  return response.text();
}

export const sbvvSwitzerlandBookIndexAdapter: BookIndexSourceAdapter = {
  sourceCode: SOURCE_CODE,
  async collect(
    context: BookIndexCollectionContext,
  ): Promise<BookIndexCollectionResult> {
    if (context.listCode !== "sbvv-ch-fiction-hardcover-weekly") {
      throw new Error("BOOK_INDEX_SBV_CH_LIST_NOT_SUPPORTED");
    }

    return parseSwitzerlandSbvvFictionHardcover(
      await fetchHtml(context.sourceUrl),
      context.sourceUrl,
    );
  },
};
