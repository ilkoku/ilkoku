import type {
  BookIndexCollectionContext,
  BookIndexCollectionResult,
  BookIndexSourceAdapter,
} from "../adapter";
import { decodeBookIndexHtml, normalizeBookIndexText } from "../html";

const SOURCE_CODE = "boklista-no";
const EXPECTED_BOOKS = 50;
const BOOK_CATEGORY = "261";
const AJAX_URL =
  "https://bokhandlerforeningen.no/wp-admin/admin-ajax.php";

type BoklistaAjaxPayload = {
  html?: string;
  last?: boolean | number | string;
  paged?: number | string;
};

function visibleText(value: string | undefined) {
  return decodeBookIndexHtml(value ?? "")
    .replace(/<[^>]+>/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function visibleLines(value: string) {
  return value
    .replace(/<!--[\s\S]*?-->/gu, "")
    .replace(/<[^>]+>/gu, "\n")
    .split(/\n+/u)
    .map((line) => decodeBookIndexHtml(line).replace(/\s+/gu, " ").trim())
    .filter(Boolean);
}

function selectedOptionValue(html: string, selectId: string) {
  const select = html.match(
    new RegExp(
      `<select\\b[^>]*\\bid=["']${selectId}["'][^>]*>([\\s\\S]*?)<\\/select>`,
      "iu",
    ),
  )?.[1];

  if (!select) return null;

  const selected = [
    ...select.matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/giu),
  ].filter((match) => /\bselected(?:\s*=\s*["'][^"']*["'])?/iu.test(match[1] ?? ""));

  const option = selected.at(-1);
  if (!option) return null;

  return option[1]?.match(/\bvalue=["']([^"']+)["']/iu)?.[1] ?? null;
}

function rankBeforeTitle(segment: string, titleIndex: number) {
  const lines = visibleLines(segment.slice(0, titleIndex));
  const candidates: number[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    if (normalizeBookIndexText(lines[index] ?? "") !== "plassering") continue;

    for (let offset = 1; offset <= 4 && index + offset < lines.length; offset += 1) {
      const value = lines[index + offset] ?? "";
      if (/^\d{1,2}$/u.test(value)) {
        candidates.push(Number(value));
        break;
      }
    }
  }

  return candidates.at(-1) ?? null;
}

export function parseNorwayMonthlyBestsellerPage(
  html: string,
  sourceUrl: string,
): BookIndexCollectionResult["books"] {
  const isbnMatches = [
    ...html.matchAll(/\b(97[89][0-9]{10})\b/gu),
  ];

  const books: BookIndexCollectionResult["books"] = [];
  let previousIsbnEnd = 0;

  for (const isbnMatch of isbnMatches) {
    const isbn13 = isbnMatch[1] ?? "";
    const isbnIndex = isbnMatch.index;

    if (!isbn13 || isbnIndex === undefined) continue;

    const segment = html.slice(previousIsbnEnd, isbnIndex);
    previousIsbnEnd = isbnIndex + isbnMatch[0].length;

    const headingMatches = [
      ...segment.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>/giu),
    ];

    if (headingMatches.length === 0) continue;

    const title = visibleText(headingMatches[0]?.[1]);
    const authorName =
      headingMatches.length >= 2
        ? visibleText(headingMatches[1]?.[1]) || null
        : null;

    const firstHeadingIndex = headingMatches[0]?.index ?? -1;
    const rank = rankBeforeTitle(segment, firstHeadingIndex);

    const lastHeading = headingMatches.at(-1);
    const lastHeadingIndex = lastHeading?.index ?? -1;
    const publisherStart =
      lastHeadingIndex >= 0
        ? lastHeadingIndex + (lastHeading?.[0].length ?? 0)
        : -1;
    const publisherName =
      publisherStart >= 0
        ? visibleLines(segment.slice(publisherStart)).at(-1) ?? ""
        : "";

    if (
      !Number.isInteger(rank)
      || rank === null
      || rank < 1
      || rank > EXPECTED_BOOKS
      || !title
      || !publisherName
    ) {
      throw new Error(
        `BOOK_INDEX_BOKLISTA_NO_INVALID_ITEM:${rank ?? "unknown"}`,
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
      rank,
      currency: "NOK",
    });
  }

  return books;
}

function validateNorwayMonthlyBooks(
  books: BookIndexCollectionResult["books"],
): BookIndexCollectionResult {
  const sorted = [...books].sort((left, right) => left.rank - right.rank);

  if (sorted.length !== EXPECTED_BOOKS) {
    throw new Error(
      `BOOK_INDEX_BOKLISTA_NO_RESULT_SIZE_MISMATCH:${sorted.length}`,
    );
  }

  if (sorted.some((book, index) => book.rank !== index + 1)) {
    throw new Error("BOOK_INDEX_BOKLISTA_NO_RANK_ORDER_MISMATCH");
  }

  const sourceKeys = new Set(sorted.map((book) => book.sourceKey));
  if (sourceKeys.size !== sorted.length) {
    throw new Error("BOOK_INDEX_BOKLISTA_NO_DUPLICATE_ISBN");
  }

  if (
    sorted.some(
      (book) =>
        normalizeBookIndexText(book.title).length === 0
        || normalizeBookIndexText(book.publisherName ?? "").length === 0,
    )
  ) {
    throw new Error("BOOK_INDEX_BOKLISTA_NO_EMPTY_BOOK_IDENTITY");
  }

  return { books: sorted };
}

async function fetchArchiveSelection(sourceUrl: string) {
  const url = new URL(sourceUrl);
  url.searchParams.set("bookcat", BOOK_CATEGORY);

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "nb-NO,nb;q=0.9,no;q=0.8,en;q=0.5",
      "User-Agent": "IlkOkuBookIndex/0.1 (+https://ilkoku.com)",
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`BOOK_INDEX_SOURCE_HTTP_${response.status}`);
  }

  const html = await response.text();
  const year = selectedOptionValue(html, "book_detail_year");
  const month = selectedOptionValue(html, "book_detail_week");

  if (!year || !/^20\d{2}$/u.test(year) || !month) {
    throw new Error("BOOK_INDEX_BOKLISTA_NO_SELECTION_NOT_FOUND");
  }

  return { year, month };
}

async function fetchAjaxPage(
  sourceUrl: string,
  year: string,
  month: string,
  page: number,
) {
  const response = await fetch(AJAX_URL, {
    method: "POST",
    cache: "no-store",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Accept-Language": "nb-NO,nb;q=0.9,no;q=0.8,en;q=0.5",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Referer: sourceUrl,
      "User-Agent": "IlkOkuBookIndex/0.1 (+https://ilkoku.com)",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: new URLSearchParams({
      action: "load_book_archive_list",
      bookcat: BOOK_CATEGORY,
      bookyear: year,
      bookweek: month,
      paged: String(page),
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`BOOK_INDEX_SOURCE_HTTP_${response.status}`);
  }

  const payload = (await response.json()) as BoklistaAjaxPayload;
  if (typeof payload.html !== "string") {
    throw new Error("BOOK_INDEX_BOKLISTA_NO_AJAX_HTML_NOT_FOUND");
  }

  return payload;
}

function isLastPage(value: BoklistaAjaxPayload["last"]) {
  return value === true || value === 1 || value === "1";
}

export const boklistaNorwayBookIndexAdapter: BookIndexSourceAdapter = {
  sourceCode: SOURCE_CODE,
  async collect(
    context: BookIndexCollectionContext,
  ): Promise<BookIndexCollectionResult> {
    if (context.listCode !== "boklista-no-monthly-top50") {
      throw new Error("BOOK_INDEX_BOKLISTA_NO_LIST_NOT_SUPPORTED");
    }

    const selection = await fetchArchiveSelection(context.sourceUrl);
    const booksByIsbn = new Map<
      string,
      BookIndexCollectionResult["books"][number]
    >();

    for (let page = 1; page <= 10; page += 1) {
      const payload = await fetchAjaxPage(
        context.sourceUrl,
        selection.year,
        selection.month,
        page,
      );
      const pageBooks = parseNorwayMonthlyBestsellerPage(
        payload.html ?? "",
        context.sourceUrl,
      );

      let newBooks = 0;

      for (const book of pageBooks) {
        const existing = booksByIsbn.get(book.sourceKey);
        if (existing) {
          if (
            existing.rank !== book.rank
            || normalizeBookIndexText(existing.title)
              !== normalizeBookIndexText(book.title)
          ) {
            throw new Error("BOOK_INDEX_BOKLISTA_NO_DUPLICATE_CONFLICT");
          }
          continue;
        }

        booksByIsbn.set(book.sourceKey, book);
        newBooks += 1;
      }

      if (booksByIsbn.size > EXPECTED_BOOKS) {
        throw new Error(
          `BOOK_INDEX_BOKLISTA_NO_RESULT_SIZE_MISMATCH:${booksByIsbn.size}`,
        );
      }

      if (booksByIsbn.size === EXPECTED_BOOKS) {
        break;
      }

      if (newBooks === 0) {
        throw new Error("BOOK_INDEX_BOKLISTA_NO_PAGINATION_STALLED");
      }

      if (isLastPage(payload.last)) {
        throw new Error(
          `BOOK_INDEX_BOKLISTA_NO_RESULT_SIZE_MISMATCH:${booksByIsbn.size}`,
        );
      }
    }

    return validateNorwayMonthlyBooks([...booksByIsbn.values()]);
  },
};
