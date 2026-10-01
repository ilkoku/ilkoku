import type {
  BookIndexCollectionContext,
  BookIndexCollectionResult,
  BookIndexSourceAdapter,
} from "../adapter";
import { decodeBookIndexHtml, normalizeBookIndexText } from "../html";

const SOURCE_CODE = "pubhub-dk";
const EXPECTED_BOOKS = 10;

function visibleText(value: string | undefined) {
  return decodeBookIndexHtml(value ?? "")
    .replace(/<[^>]+>/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function ebookTable(html: string) {
  return html.match(
    /<table\b[^>]*\bid=["']GridView_Bestseller["'][^>]*>([\s\S]*?)<\/table>/iu,
  )?.[1] ?? null;
}

export function parseDenmarkPubhubEbooks(
  html: string,
  sourceUrl: string,
): BookIndexCollectionResult {
  const table = ebookTable(html);
  if (!table) {
    throw new Error("BOOK_INDEX_PUBHUB_DK_EBOOK_TABLE_NOT_FOUND");
  }

  const books: BookIndexCollectionResult["books"] = [];

  for (const rowMatch of table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/giu)) {
    const row = rowMatch[1] ?? "";
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/giu)]
      .map((match) => visibleText(match[1]));

    if (cells.length < 6) continue;

    const rank = Number(cells[0]);
    const title = cells[2] ?? "";
    const isbn13 = cells[3]?.match(/\b(97[89][0-9]{10})\b/u)?.[1] ?? "";
    const authorName = cells[4] ?? "";
    const publisherName = cells[5] ?? "";

    if (
      !Number.isInteger(rank)
      || rank < 1
      || rank > EXPECTED_BOOKS
      || !title
      || !isbn13
      || !authorName
      || !publisherName
    ) {
      throw new Error(
        `BOOK_INDEX_PUBHUB_DK_INVALID_ITEM:${Number.isInteger(rank) ? rank : "unknown"}`,
      );
    }

    books.push({
      sourceKey: isbn13,
      sourceExternalId: isbn13,
      title,
      authorName,
      publisherName,
      isbn13,
      productUrl: sourceUrl,
      imageUrl: null,
      rank,
      currency: "DKK",
    });
  }

  books.sort((left, right) => left.rank - right.rank);

  if (books.length !== EXPECTED_BOOKS) {
    throw new Error(
      `BOOK_INDEX_PUBHUB_DK_RESULT_SIZE_MISMATCH:${books.length}`,
    );
  }

  if (books[0]?.rank !== 1) {
    throw new Error("BOOK_INDEX_PUBHUB_DK_RANK_ORDER_MISMATCH");
  }

  for (let index = 1; index < books.length; index += 1) {
    const previousRank = books[index - 1]?.rank;
    const rank = books[index]?.rank;

    if (rank !== previousRank && rank !== index + 1) {
      throw new Error("BOOK_INDEX_PUBHUB_DK_RANK_ORDER_MISMATCH");
    }
  }

  const sourceKeys = new Set(books.map((book) => book.sourceKey));
  if (sourceKeys.size !== books.length) {
    throw new Error("BOOK_INDEX_PUBHUB_DK_DUPLICATE_ISBN");
  }

  if (books.some((book) => normalizeBookIndexText(book.title).length === 0)) {
    throw new Error("BOOK_INDEX_PUBHUB_DK_EMPTY_TITLE");
  }

  return { books };
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "da-DK,da;q=0.9,en;q=0.5",
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

export const pubhubDenmarkBookIndexAdapter: BookIndexSourceAdapter = {
  sourceCode: SOURCE_CODE,
  async collect(
    context: BookIndexCollectionContext,
  ): Promise<BookIndexCollectionResult> {
    if (context.listCode !== "pubhub-dk-ebooks-weekly") {
      throw new Error("BOOK_INDEX_PUBHUB_DK_LIST_NOT_SUPPORTED");
    }

    return parseDenmarkPubhubEbooks(
      await fetchHtml(context.sourceUrl),
      context.sourceUrl,
    );
  },
};
