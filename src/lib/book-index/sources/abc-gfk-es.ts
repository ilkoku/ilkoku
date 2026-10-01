import { createHash } from "node:crypto";

import type {
  BookIndexCollectionContext,
  BookIndexCollectionResult,
  BookIndexSourceAdapter,
} from "../adapter";
import { decodeBookIndexHtml, normalizeBookIndexText } from "../html";

const SOURCE_CODE = "abc-gfk-es";
const LIST_CODE = "abc-gfk-es-fiction-weekly";
const EXPECTED_BOOKS = 10;
const ARTICLE_PATH_PREFIX =
  "/cultura/cultural/libros-vendidos-ficcion-semana-";

function visibleText(value: string | undefined) {
  return decodeBookIndexHtml(value ?? "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, " ")
    .replace(/<!--[\s\S]*?-->/gu, " ")
    .replace(/<[^>]+>/gu, " ")
    .replace(/\u00a0/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function normalizeAuthorCandidate(value: string | undefined) {
  return visibleText(value)
    .replace(/^[,.;:\s]+|[,.;:\s]+$/gu, "")
    .trim();
}

function extractDeAuthorName(localText: string) {
  if (!/^,\s*de\s+/iu.test(localText)) return null;

  const rest = localText.replace(/^,\s*de\s+/iu, "");
  const punctuationBoundary = rest.search(
    /[.;,](?=\s+[A-ZÁÉÍÓÚÑÜ])/u,
  );
  const narrativeBoundary = rest.search(
    /\s+(?=[A-ZÁÉÍÓÚÑÜ][\p{L}.'’\-]+\s+[a-záéíóúñü])/u,
  );
  const boundaries = [punctuationBoundary, narrativeBoundary].filter(
    (value) => value >= 0,
  );
  const end = boundaries.length > 0 ? Math.min(...boundaries) : rest.length;

  return normalizeAuthorCandidate(rest.slice(0, end));
}

function extractAuthorName(postEntry: string) {
  const localText = visibleText(postEntry).slice(0, 500);
  const deAuthorName = extractDeAuthorName(localText);
  if (deAuthorName) return deAuthorName;

  const patterns = [
    /^\.\s*Vuelve[^.]{0,180}?\bfirma\s+como\s+([^,.;]+?)(?=\s*,)/iu,
    /^\.\s*La\s+escritora(?:\s+[\p{Ll}\-]+)?\s+([A-ZÁÉÍÓÚÑÜ][^,.;]+?)\s+ha\b/u,
    /^\.\s*La\s+francesa\s+([A-ZÁÉÍÓÚÑÜ][^,.;]+?)\s+explora\b/u,
    /^\.\s*([A-ZÁÉÍÓÚÑÜ][^,.;]+?)\s+nos\b/u,
    /^\.\s*([A-ZÁÉÍÓÚÑÜ][^,.;]+?)(?=\s*,\s*autora\b)/u,
  ];

  for (const pattern of patterns) {
    const authorName = normalizeAuthorCandidate(localText.match(pattern)?.[1]);
    if (authorName) return authorName;
  }

  return null;
}

function stableSourceKey(title: string, publisherName: string) {
  const identity = [
    normalizeBookIndexText(title),
    normalizeBookIndexText(publisherName),
  ].join("|");

  return createHash("sha256").update(identity).digest("hex").slice(0, 32);
}

export function discoverLatestAbcGfkSpainFictionArticle(
  archiveHtml: string,
  archiveUrl: string,
) {
  const candidates = [
    ...archiveHtml.matchAll(/href=["']([^"']+)["']/giu),
  ]
    .map((match) => decodeBookIndexHtml(match[1] ?? ""))
    .filter((href) => href.includes(ARTICLE_PATH_PREFIX));

  const first = candidates[0];
  if (!first) {
    throw new Error("BOOK_INDEX_ABC_GFK_ES_LATEST_ARTICLE_NOT_FOUND");
  }

  const url = new URL(first, archiveUrl);
  if (url.hostname !== "www.abc.es") {
    throw new Error("BOOK_INDEX_ABC_GFK_ES_INVALID_ARTICLE_HOST");
  }

  return url.toString();
}

export function parseAbcGfkSpainWeeklyFiction(
  articleHtml: string,
  articleUrl: string,
): BookIndexCollectionResult {
  const text = visibleText(articleHtml);
  const books: BookIndexCollectionResult["books"] = [];

  for (let rank = 1; rank <= EXPECTED_BOOKS; rank += 1) {
    const nextRank = rank + 1;
    const marker = new RegExp(
      `puesto\\s+${rank}º(?:[^‘’]{0,120})‘([^’]+)’\\s*\\(([^)]+)\\)`,
      "iu",
    );
    const match = text.match(marker);

    if (!match) {
      throw new Error(`BOOK_INDEX_ABC_GFK_ES_RANK_NOT_FOUND:${rank}`);
    }

    const title = visibleText(match[1]);
    const publisherName = visibleText(match[2]);
    const currentIndex = match.index ?? -1;
    const nextRankIndex =
      nextRank <= EXPECTED_BOOKS
        ? text.search(new RegExp(`puesto\\s+${nextRank}º`, "iu"))
        : text.length;
    const segment =
      currentIndex >= 0
        ? text.slice(
            currentIndex,
            nextRankIndex > currentIndex ? nextRankIndex : text.length,
          )
        : "";
    const postEntry =
      segment.length >= match[0].length
        ? segment.slice(match[0].length)
        : "";
    const authorName = extractAuthorName(postEntry);

    if (!title || !publisherName || !authorName) {
      throw new Error(`BOOK_INDEX_ABC_GFK_ES_INVALID_ITEM:${rank}`);
    }

    if (
      nextRank <= EXPECTED_BOOKS
      && currentIndex >= 0
      && nextRankIndex >= 0
      && nextRankIndex <= currentIndex
    ) {
      throw new Error("BOOK_INDEX_ABC_GFK_ES_RANK_ORDER_MISMATCH");
    }

    const sourceKey = stableSourceKey(title, publisherName);

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
      currency: "EUR",
    });
  }

  if (books.length !== EXPECTED_BOOKS) {
    throw new Error(
      `BOOK_INDEX_ABC_GFK_ES_RESULT_SIZE_MISMATCH:${books.length}`,
    );
  }

  if (books.some((book, index) => book.rank !== index + 1)) {
    throw new Error("BOOK_INDEX_ABC_GFK_ES_RANK_ORDER_MISMATCH");
  }

  const sourceKeys = new Set(books.map((book) => book.sourceKey));
  if (sourceKeys.size !== books.length) {
    throw new Error("BOOK_INDEX_ABC_GFK_ES_DUPLICATE_IDENTITY");
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

export const abcGfkSpainBookIndexAdapter: BookIndexSourceAdapter = {
  sourceCode: SOURCE_CODE,
  async collect(
    context: BookIndexCollectionContext,
  ): Promise<BookIndexCollectionResult> {
    if (context.listCode !== LIST_CODE) {
      throw new Error("BOOK_INDEX_ABC_GFK_ES_LIST_NOT_SUPPORTED");
    }

    const archiveHtml = await fetchHtml(context.sourceUrl);
    const articleUrl = discoverLatestAbcGfkSpainFictionArticle(
      archiveHtml,
      context.sourceUrl,
    );
    const articleHtml = await fetchHtml(articleUrl);

    return parseAbcGfkSpainWeeklyFiction(articleHtml, articleUrl);
  },
};
