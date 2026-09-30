import type {
  BookIndexCollectionContext,
  BookIndexCollectionResult,
  BookIndexSourceAdapter,
} from "../adapter";
import { decodeBookIndexHtml, normalizeBookIndexText } from "../html";

const SOURCE_CODE = "bestseller60-nl";
const SOURCE_ORIGIN = "https://www.debestseller60.nl";
const EXPECTED_BOOKS = 60;

function htmlToVisibleLines(html: string) {
  const withoutNoise = html
    .replace(/<!--[sS]*?-->/gu, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, " ")
    .replace(
      /<img\b[^>]*\balt=(["'])([\s\S]*?)\1[^>]*>/giu,
      (_match, _quote, alt: string) => `\n${alt}\n`,
    )
    .replace(/<br\s*\/?\s*>/giu, "\n")
    .replace(/<\/(?:p|div|li|h[1-6]|section|article|a)>/giu, "\n")
    .replace(/<[^>]+>/gu, " ");

  return decodeBookIndexHtml(withoutNoise)
    .split(/\n+/u)
    .map((line) => line.replace(/\s+/gu, " ").trim())
    .filter(Boolean);
}

function bolSearchUrl(isbn13: string) {
  return `https://www.bol.com/nl/nl/s/?searchtext=${encodeURIComponent(isbn13)}`;
}

export function parseNetherlandsBestseller60(
  html: string,
): BookIndexCollectionResult {
  const lines = htmlToVisibleLines(html);
  const headingIndex = lines.findIndex((line) => line === "Bestseller 60");
  if (headingIndex < 0) {
    const preview = lines.slice(0, 12).join(" | ").slice(0, 240);
    throw new Error(
      `BOOK_INDEX_BESTSELLER60_NL_HEADING_NOT_FOUND:${preview}`,
    );
  }

  const books: BookIndexCollectionResult["books"] = [];
  let cursor = headingIndex + 1;

  for (let rank = 1; rank <= EXPECTED_BOOKS; rank += 1) {
    const rankIndex = lines.findIndex(
      (line, index) => index >= cursor && line === String(rank),
    );
    if (rankIndex < 0) {
      throw new Error(
        `BOOK_INDEX_BESTSELLER60_NL_RANK_NOT_FOUND:${rank}`,
      );
    }

    const nextRankIndex =
      rank < EXPECTED_BOOKS
        ? lines.findIndex(
            (line, index) => index > rankIndex && line === String(rank + 1),
          )
        : lines.length;
    if (nextRankIndex < 0) {
      throw new Error(
        `BOOK_INDEX_BESTSELLER60_NL_NEXT_RANK_NOT_FOUND:${rank + 1}`,
      );
    }

    const segment = lines.slice(rankIndex + 1, nextRankIndex);
    const isbn13 =
      segment.join(" ").match(/\bISBN\s*(97[89][0-9]{10})\b/u)?.[1] ?? "";

    const titleFromImage = segment[0] ?? "";
    const authorName = segment[1] ?? "";
    const repeatedTitle =
      segment.find(
        (line, lineIndex) =>
          lineIndex >= 2
          && normalizeBookIndexText(line)
            === normalizeBookIndexText(titleFromImage),
      ) ?? "";

    if (
      !isbn13
      || !titleFromImage
      || !authorName
      || normalizeBookIndexText(titleFromImage)
        !== normalizeBookIndexText(repeatedTitle)
    ) {
      throw new Error(
        `BOOK_INDEX_BESTSELLER60_NL_INVALID_ITEM:${rank}`,
      );
    }

    books.push({
      sourceKey: isbn13,
      sourceExternalId: isbn13,
      title: titleFromImage,
      authorName,
      publisherName: null,
      isbn13,
      productUrl: bolSearchUrl(isbn13),
      imageUrl: null,
      rank,
      currency: "EUR",
    });

    cursor = nextRankIndex;
  }

  if (books.length !== EXPECTED_BOOKS) {
    throw new Error(
      `BOOK_INDEX_BESTSELLER60_NL_RESULT_SIZE_MISMATCH:${books.length}`,
    );
  }

  if (books.some((book, index) => book.rank !== index + 1)) {
    throw new Error("BOOK_INDEX_BESTSELLER60_NL_RANK_ORDER_MISMATCH");
  }

  const sourceKeys = new Set(books.map((book) => book.sourceKey));
  if (sourceKeys.size !== books.length) {
    throw new Error("BOOK_INDEX_BESTSELLER60_NL_DUPLICATE_ISBN");
  }

  return { books };
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "nl-NL,nl;q=0.9,en;q=0.5",
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

export const bestseller60NetherlandsBookIndexAdapter: BookIndexSourceAdapter = {
  sourceCode: SOURCE_CODE,
  async collect(
    context: BookIndexCollectionContext,
  ): Promise<BookIndexCollectionResult> {
    if (context.listCode !== "bestseller60-nl-weekly") {
      throw new Error("BOOK_INDEX_BESTSELLER60_NL_LIST_NOT_SUPPORTED");
    }

    return parseNetherlandsBestseller60(
      await fetchHtml(context.sourceUrl),
    );
  },
};
