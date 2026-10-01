import { createHash } from "node:crypto";

import type {
  BookIndexCollectionContext,
  BookIndexCollectionResult,
  BookIndexSourceAdapter,
} from "../adapter";
import { decodeBookIndexHtml, normalizeBookIndexText } from "../html";

const SOURCE_CODE = "kirjakauppaliitto-fi";
const EXPECTED_BOOKS = 20;

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

function allFormatsTable(html: string) {
  return [...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/giu)]
    .map((match) => match[1] ?? "")
    .find((table) => {
      const text = visibleText(table).toLocaleLowerCase("fi-FI");
      return text.includes("myydyimmät kaikki formaatit");
    }) ?? null;
}

export function parseFinlandMonthlyBestsellers(
  html: string,
  sourceUrl: string,
): BookIndexCollectionResult {
  const table = allFormatsTable(html);
  if (!table) {
    throw new Error("BOOK_INDEX_KIRJAKAUPPALIITTO_FI_TABLE_NOT_FOUND");
  }

  const books: BookIndexCollectionResult["books"] = [];

  for (const rowMatch of table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/giu)) {
    const row = rowMatch[1] ?? "";
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/giu)]
      .map((match) => visibleText(match[1]));

    if (cells.length < 5) continue;

    const rankMatch = cells[0]?.match(/^([1-9]|1[0-9]|20)\.$/u);
    if (!rankMatch) continue;

    const rank = Number(rankMatch[1]);
    const authorName = cells[2] ?? "";
    const title = cells[3] ?? "";
    const publisherName = cells[4] ?? "";

    if (
      !Number.isInteger(rank)
      || !authorName
      || !title
      || !publisherName
    ) {
      throw new Error(
        `BOOK_INDEX_KIRJAKAUPPALIITTO_FI_INVALID_ITEM:${rank || "unknown"}`,
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
      productUrl: sourceUrl,
      imageUrl: null,
      rank,
      currency: "EUR",
    });
  }

  books.sort((left, right) => left.rank - right.rank);

  if (books.length !== EXPECTED_BOOKS) {
    throw new Error(
      `BOOK_INDEX_KIRJAKAUPPALIITTO_FI_RESULT_SIZE_MISMATCH:${books.length}`,
    );
  }

  if (books.some((book, index) => book.rank !== index + 1)) {
    throw new Error("BOOK_INDEX_KIRJAKAUPPALIITTO_FI_RANK_ORDER_MISMATCH");
  }

  const sourceKeys = new Set(books.map((book) => book.sourceKey));
  if (sourceKeys.size !== books.length) {
    throw new Error("BOOK_INDEX_KIRJAKAUPPALIITTO_FI_DUPLICATE_IDENTITY");
  }

  return { books };
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "fi-FI,fi;q=0.9,en;q=0.5",
      "User-Agent": "IlkOkuBookIndex/0.1 (+https://ilkoku.com)",
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`BOOK_INDEX_SOURCE_HTTP_${response.status}`);
  }

  return response.text();
}

export const kirjakauppaliittoFinlandBookIndexAdapter: BookIndexSourceAdapter = {
  sourceCode: SOURCE_CODE,
  async collect(
    context: BookIndexCollectionContext,
  ): Promise<BookIndexCollectionResult> {
    if (context.listCode !== "kirjakauppaliitto-fi-monthly") {
      throw new Error("BOOK_INDEX_KIRJAKAUPPALIITTO_FI_LIST_NOT_SUPPORTED");
    }

    return parseFinlandMonthlyBestsellers(
      await fetchHtml(context.sourceUrl),
      context.sourceUrl,
    );
  },
};
