import { createHash } from "node:crypto";

import type {
  BookIndexCollectionContext,
  BookIndexCollectionResult,
  BookIndexSourceAdapter,
} from "../adapter";
import { decodeBookIndexHtml, normalizeBookIndexText } from "../html";

const SOURCE_CODE = "forlaggare-se";
const EXPECTED_BOOKS = 5;
const WORDPRESS_PAGE_API =
  "https://forlaggare.se/wp-json/wp/v2/pages?slug=topplistor";

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

function fictionDesktopGrid(html: string) {
  const heading = "Topplista: Skönlitteratur";
  const headingIndex = html.indexOf(heading);
  if (headingIndex < 0) return null;

  const gridMarker = "jet-listing-grid--13066";
  const gridIndex = html.indexOf(gridMarker, headingIndex);
  if (gridIndex < 0) return null;

  const repeatedHeadingIndex = html.indexOf(heading, gridIndex);
  const endIndex = repeatedHeadingIndex >= 0 ? repeatedHeadingIndex : html.length;

  return html.slice(gridIndex, endIndex);
}

export function parseSwedenWeeklyFiction(
  html: string,
  sourceUrl: string,
): BookIndexCollectionResult {
  const grid = fictionDesktopGrid(html);
  if (!grid) {
    throw new Error("BOOK_INDEX_FORLAGGARE_SE_FICTION_GRID_NOT_FOUND");
  }

  const itemMatches = [
    ...grid.matchAll(
      /<div\b[^>]*\bclass=["'][^"']*\bjet-listing-grid__item\b[^"']*["'][^>]*>/giu,
    ),
  ];

  const books: BookIndexCollectionResult["books"] = [];

  for (let index = 0; index < itemMatches.length; index += 1) {
    const start = itemMatches[index]?.index;
    if (start === undefined) continue;

    const end = itemMatches[index + 1]?.index ?? grid.length;
    const item = grid.slice(start, end);

    const headingValues = [
      ...item.matchAll(
        /<h2\b[^>]*\bclass=["'][^"']*\bjet-listing-dynamic-field__content\b[^"']*["'][^>]*>([\s\S]*?)<\/h2>/giu,
      ),
    ].map((match) => visibleText(match[1]));

    const rankText = headingValues.find((value) => /^[1-5]$/u.test(value));
    const authorName =
      headingValues.find((value) => value && !/^[1-5]$/u.test(value)) ?? "";

    const title = visibleText(
      item.match(
        /<h1\b[^>]*\bclass=["'][^"']*\bjet-listing-dynamic-field__content\b[^"']*["'][^>]*>([\s\S]*?)<\/h1>/iu,
      )?.[1],
    );

    const publisherName = visibleText(
      item.match(
        /<div\b[^>]*\bclass=["'][^"']*\bjet-listing-dynamic-field__content\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/iu,
      )?.[1],
    );

    if (!rankText || !title || !authorName || !publisherName) continue;

    const rank = Number(rankText);
    const sourceKey = stableSourceKey(title, authorName, publisherName);

    const imageUrl =
      item.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/iu)?.[1] ?? null;

    books.push({
      sourceKey,
      sourceExternalId: sourceKey,
      title,
      authorName,
      publisherName,
      isbn13: null,
      isbn10: null,
      productUrl: sourceUrl,
      imageUrl,
      rank,
      currency: "SEK",
    });
  }

  books.sort((left, right) => left.rank - right.rank);

  if (books.length !== EXPECTED_BOOKS) {
    throw new Error(
      `BOOK_INDEX_FORLAGGARE_SE_RESULT_SIZE_MISMATCH:${books.length}`,
    );
  }

  if (books.some((book, index) => book.rank !== index + 1)) {
    throw new Error("BOOK_INDEX_FORLAGGARE_SE_RANK_ORDER_MISMATCH");
  }

  const sourceKeys = new Set(books.map((book) => book.sourceKey));
  if (sourceKeys.size !== books.length) {
    throw new Error("BOOK_INDEX_FORLAGGARE_SE_DUPLICATE_IDENTITY");
  }

  return { books };
}

async function fetchRenderedPageHtml() {
  const response = await fetch(WORDPRESS_PAGE_API, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.5",
      "User-Agent": "IlkOkuBookIndex/0.1 (+https://ilkoku.com)",
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`BOOK_INDEX_SOURCE_HTTP_${response.status}`);
  }

  const payload = (await response.json()) as Array<{
    content?: { rendered?: string };
  }>;

  const html = payload[0]?.content?.rendered;
  if (!html) {
    throw new Error("BOOK_INDEX_FORLAGGARE_SE_PAGE_CONTENT_NOT_FOUND");
  }

  return html;
}

export const forlaggareSwedenBookIndexAdapter: BookIndexSourceAdapter = {
  sourceCode: SOURCE_CODE,
  async collect(
    context: BookIndexCollectionContext,
  ): Promise<BookIndexCollectionResult> {
    if (context.listCode !== "forlaggare-se-fiction-weekly") {
      throw new Error("BOOK_INDEX_FORLAGGARE_SE_LIST_NOT_SUPPORTED");
    }

    return parseSwedenWeeklyFiction(
      await fetchRenderedPageHtml(),
      context.sourceUrl,
    );
  },
};
