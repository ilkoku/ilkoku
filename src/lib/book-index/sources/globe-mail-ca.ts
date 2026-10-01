import { createHash } from "node:crypto";

import type {
  BookIndexCollectionContext,
  BookIndexCollectionResult,
  BookIndexSourceAdapter,
} from "../adapter";
import { decodeBookIndexHtml, normalizeBookIndexText } from "../html";

const SOURCE_CODE = "globe-mail-ca";
const EXPECTED_BOOKS = 10;
const ARTICLE_PATH_PREFIX =
  "/culture/books/bestsellers/article-the-globe-and-mail-bestsellers-for-the-week-of-";

function visibleText(value: string | undefined) {
  return decodeBookIndexHtml(value ?? "")
    .replace(/<[^>]+>/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function stableSourceKey(
  title: string,
  authorName: string,
  publisherName: string,
) {
  const identity = [
    normalizeBookIndexText(title),
    normalizeBookIndexText(authorName),
    normalizeBookIndexText(publisherName),
  ].join("|");

  return createHash("sha256").update(identity).digest("hex").slice(0, 32);
}

export function discoverLatestGlobeMailBestsellerArticle(
  archiveHtml: string,
  archiveUrl: string,
) {
  const links = [
    ...archiveHtml.matchAll(/href=["']([^"']+)["']/giu),
  ]
    .map((match) => decodeBookIndexHtml(match[1] ?? ""))
    .filter((href) => href.includes(ARTICLE_PATH_PREFIX));

  const first = links[0];
  if (!first) {
    throw new Error("BOOK_INDEX_GLOBE_MAIL_CA_LATEST_ARTICLE_NOT_FOUND");
  }

  const url = new URL(first, archiveUrl);
  if (url.hostname !== "www.theglobeandmail.com") {
    throw new Error("BOOK_INDEX_GLOBE_MAIL_CA_INVALID_ARTICLE_HOST");
  }

  return url.toString();
}

function hardcoverFictionTable(articleHtml: string) {
  const headingMatch = articleHtml.match(
    /<h3\b[^>]*>\s*Hardcover Fiction:\s*([\s\S]*?)<\/h3>/iu,
  );
  if (!headingMatch || headingMatch.index === undefined) {
    throw new Error("BOOK_INDEX_GLOBE_MAIL_CA_HARDCOVER_FICTION_HEADING_NOT_FOUND");
  }

  const afterHeading = articleHtml.slice(
    headingMatch.index + headingMatch[0].length,
  );
  const table = afterHeading.match(/<table\b[^>]*>([\s\S]*?)<\/table>/iu)?.[1];

  if (!table) {
    throw new Error("BOOK_INDEX_GLOBE_MAIL_CA_HARDCOVER_FICTION_TABLE_NOT_FOUND");
  }

  return table;
}

export function parseGlobeMailCanadaHardcoverFiction(
  articleHtml: string,
  articleUrl: string,
): BookIndexCollectionResult {
  const table = hardcoverFictionTable(articleHtml);
  const books: BookIndexCollectionResult["books"] = [];

  for (const rowMatch of table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/giu)) {
    const cells = [
      ...(rowMatch[1] ?? "").matchAll(
        /<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)>/giu,
      ),
    ].map((match) => visibleText(match[1]));

    if (cells.length < 4 || normalizeBookIndexText(cells[0] ?? "") === "rank") {
      continue;
    }

    const rank = Number(cells[0]);
    const title = cells[1] ?? "";
    const authorName = cells[2] ?? "";
    const publisherName = cells[3] ?? "";

    if (
      !Number.isInteger(rank)
      || rank < 1
      || rank > EXPECTED_BOOKS
      || !title
      || !authorName
      || !publisherName
    ) {
      throw new Error(
        `BOOK_INDEX_GLOBE_MAIL_CA_INVALID_ITEM:${Number.isInteger(rank) ? rank : "unknown"}`,
      );
    }

    const sourceKey = stableSourceKey(title, authorName, publisherName);

    books.push({
      sourceKey,
      sourceExternalId: sourceKey,
      title,
      authorName,
      publisherName,
      isbn13: null,
      isbn10: null,
      productUrl: articleUrl,
      imageUrl: null,
      rank,
      currency: "CAD",
    });
  }

  books.sort((left, right) => left.rank - right.rank);

  if (books.length !== EXPECTED_BOOKS) {
    throw new Error(
      `BOOK_INDEX_GLOBE_MAIL_CA_RESULT_SIZE_MISMATCH:${books.length}`,
    );
  }

  if (books.some((book, index) => book.rank !== index + 1)) {
    throw new Error("BOOK_INDEX_GLOBE_MAIL_CA_RANK_ORDER_MISMATCH");
  }

  const sourceKeys = new Set(books.map((book) => book.sourceKey));
  if (sourceKeys.size !== books.length) {
    throw new Error("BOOK_INDEX_GLOBE_MAIL_CA_DUPLICATE_IDENTITY");
  }

  return { books };
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-CA,en;q=0.9",
      "User-Agent": "IlkOkuBookIndex/0.1 (+https://ilkoku.com)",
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`BOOK_INDEX_SOURCE_HTTP_${response.status}`);
  }

  return response.text();
}

export const globeMailCanadaBookIndexAdapter: BookIndexSourceAdapter = {
  sourceCode: SOURCE_CODE,
  async collect(
    context: BookIndexCollectionContext,
  ): Promise<BookIndexCollectionResult> {
    if (context.listCode !== "globe-mail-ca-hardcover-fiction-weekly") {
      throw new Error("BOOK_INDEX_GLOBE_MAIL_CA_LIST_NOT_SUPPORTED");
    }

    const archiveHtml = await fetchHtml(context.sourceUrl);
    const articleUrl = discoverLatestGlobeMailBestsellerArticle(
      archiveHtml,
      context.sourceUrl,
    );
    const articleHtml = await fetchHtml(articleUrl);

    return parseGlobeMailCanadaHardcoverFiction(articleHtml, articleUrl);
  },
};
