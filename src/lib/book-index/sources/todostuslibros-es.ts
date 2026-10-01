import type {
  BookIndexCollectionContext,
  BookIndexCollectionResult,
  BookIndexSourceAdapter,
} from "../adapter";
import { decodeBookIndexHtml, normalizeBookIndexText } from "../html";

const SOURCE_CODE = "todostuslibros-es";
const EXPECTED_BOOKS = 20;
const EXPECTED_HEADING = "Los 100 más vendidos";

function visibleText(value: string | undefined) {
  return decodeBookIndexHtml(value ?? "")
    .replace(/<[^>]+>/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function absoluteUrl(value: string, sourceUrl: string) {
  try {
    return new URL(decodeBookIndexHtml(value), sourceUrl).toString();
  } catch {
    return "";
  }
}

function normalizedIsbn13(value: string) {
  const digits = value.replace(/\D/gu, "");
  return /^97[89]\d{10}$/u.test(digits) ? digits : "";
}

function productAnchors(itemHtml: string, sourceUrl: string) {
  return [
    ...itemHtml.matchAll(
      /<a\b([^>]*)href=["']([^"']*\/libros\/[^"']+)["']([^>]*)>([\s\S]*?)<\/a>/giu,
    ),
  ].map((match) => ({
    url: absoluteUrl(match[2] ?? "", sourceUrl),
    text: visibleText(match[4]),
  }));
}

function publisherFromItem(itemHtml: string) {
  for (const match of itemHtml.matchAll(
    /<a\b[^>]*href=["'][^"']*\/editoriales\/[^"']+["'][^>]*>([\s\S]*?)<\/a>/giu,
  )) {
    const value = visibleText(match[1]);
    if (value) return value;
  }
  return "";
}

function authorFromItem(itemHtml: string, isbnText: string) {
  const paragraphs = [
    ...itemHtml.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/giu),
  ].map((match) => visibleText(match[1]));

  const isbnIndex = paragraphs.findIndex(
    (value) => normalizedIsbn13(value) === normalizedIsbn13(isbnText),
  );

  if (isbnIndex <= 0) return "";

  return paragraphs[isbnIndex - 1] ?? "";
}

export function parseTodosTusLibrosSpainWeeklyTop20(
  html: string,
  sourceUrl: string,
): BookIndexCollectionResult {
  if (!visibleText(html).includes(EXPECTED_HEADING)) {
    throw new Error("BOOK_INDEX_TODOSTUSLIBROS_ES_HEADING_NOT_FOUND");
  }

  if (!/Los libros más vendidos en la última semana\./iu.test(visibleText(html))) {
    throw new Error("BOOK_INDEX_TODOSTUSLIBROS_ES_WEEKLY_SCOPE_NOT_FOUND");
  }

  const items = [...html.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/giu)];
  const books: BookIndexCollectionResult["books"] = [];

  for (const itemMatch of items) {
    const item = itemMatch[1] ?? "";
    const anchors = productAnchors(item, sourceUrl);

    if (anchors.length < 2) continue;

    const rankAnchor = anchors.find((anchor) => /^\d{1,3}$/u.test(anchor.text));
    if (!rankAnchor) continue;

    const rank = Number(rankAnchor.text);
    if (!Number.isInteger(rank) || rank < 1 || rank > EXPECTED_BOOKS) {
      continue;
    }

    const titleAnchor = anchors.find(
      (anchor) => anchor.url === rankAnchor.url && !/^\d{1,3}$/u.test(anchor.text),
    );
    if (!titleAnchor?.text || !rankAnchor.url) {
      throw new Error(
        `BOOK_INDEX_TODOSTUSLIBROS_ES_TITLE_NOT_FOUND:${rank}`,
      );
    }

    const isbnRaw =
      item.match(/\b(97[89](?:[-\s]?\d){10})\b/u)?.[1] ?? "";
    const isbn13 = normalizedIsbn13(isbnRaw);
    const authorName = authorFromItem(item, isbnRaw);
    const publisherName = publisherFromItem(item);

    if (!isbn13 || !authorName || !publisherName) {
      throw new Error(
        `BOOK_INDEX_TODOSTUSLIBROS_ES_INVALID_ITEM:${rank}`,
      );
    }

    const productHost = new URL(rankAnchor.url).hostname;
    if (productHost !== "www.todostuslibros.com") {
      throw new Error("BOOK_INDEX_TODOSTUSLIBROS_ES_INVALID_PRODUCT_HOST");
    }

    books.push({
      sourceKey: isbn13,
      sourceExternalId: isbn13,
      title: titleAnchor.text,
      authorName,
      publisherName,
      isbn13,
      isbn10: null,
      productUrl: rankAnchor.url,
      imageUrl:
        item.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/iu)?.[1] ?? null,
      rank,
      currency: "EUR",
    });
  }

  books.sort((left, right) => left.rank - right.rank);

  if (books.length !== EXPECTED_BOOKS) {
    throw new Error(
      `BOOK_INDEX_TODOSTUSLIBROS_ES_RESULT_SIZE_MISMATCH:${books.length}`,
    );
  }

  if (books.some((book, index) => book.rank !== index + 1)) {
    throw new Error("BOOK_INDEX_TODOSTUSLIBROS_ES_RANK_ORDER_MISMATCH");
  }

  const sourceKeys = new Set(books.map((book) => book.sourceKey));
  if (sourceKeys.size !== books.length) {
    throw new Error("BOOK_INDEX_TODOSTUSLIBROS_ES_DUPLICATE_ISBN");
  }

  if (
    books.some(
      (book) =>
        normalizeBookIndexText(book.title).length === 0
        || normalizeBookIndexText(book.authorName ?? "").length === 0
        || normalizeBookIndexText(book.publisherName ?? "").length === 0,
    )
  ) {
    throw new Error("BOOK_INDEX_TODOSTUSLIBROS_ES_EMPTY_IDENTITY");
  }

  return { books };
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "es-ES,es;q=0.9,en;q=0.5",
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

export const todosTusLibrosSpainBookIndexAdapter: BookIndexSourceAdapter = {
  sourceCode: SOURCE_CODE,
  async collect(
    context: BookIndexCollectionContext,
  ): Promise<BookIndexCollectionResult> {
    if (context.listCode !== "todostuslibros-es-weekly-top20") {
      throw new Error("BOOK_INDEX_TODOSTUSLIBROS_ES_LIST_NOT_SUPPORTED");
    }

    return parseTodosTusLibrosSpainWeeklyTop20(
      await fetchHtml(context.sourceUrl),
      context.sourceUrl,
    );
  },
};
