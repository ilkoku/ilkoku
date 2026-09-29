import type {
  BookIndexCollectionContext,
  BookIndexCollectionResult,
  BookIndexSourceAdapter,
} from "../adapter";
import { decodeBookIndexHtml } from "../html";

const SOURCE_CODE = "ibs-it";
const SOURCE_ORIGIN = "https://www.ibs.it";
const EXPECTED_BOOKS = 100;
const PAGE_SIZE = 40;
const PAGE_COUNT = 3;

function normalizeText(value: string | undefined) {
  return decodeBookIndexHtml(value ?? "")
    .replace(/<[^>]+>/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function attributeValue(fragment: string, name: string) {
  const match = fragment.match(
    new RegExp(`\\b${name}=(["'])([\\s\\S]*?)\\1`, "iu"),
  );
  return match?.[2] ? decodeBookIndexHtml(match[2]) : "";
}

function absoluteUrl(value: string) {
  return new URL(value, SOURCE_ORIGIN).toString();
}

function isbn13FromEan(ean: string) {
  return /^(?:978|979)[0-9]{10}$/u.test(ean) ? ean : null;
}

function parsePublisher(owner: string) {
  const normalized = normalizeText(owner);
  if (!normalized) return null;

  const withoutYear = normalized.replace(/,\s*\d{4}\s*$/u, "").trim();
  return withoutYear || normalized;
}

export function parseIbsDailyBestsellerPage(
  html: string,
  expectedStartRank: number,
  expectedEndRank: number,
): BookIndexCollectionResult {
  if (
    !/Classifica Libri del giorno/iu.test(normalizeText(html))
    || !/I Più Venduti/iu.test(normalizeText(html))
  ) {
    throw new Error("BOOK_INDEX_IBS_DAILY_SOLD_SEMANTICS_MISSING");
  }

  const cards = [
    ...html.matchAll(
      /<div\b[^>]*class=(["'])[^"']*\bcc-product-list-item\b[^"']*\bcc-product-list-item--ranking\b[^"']*\1[^>]*>([\s\S]*?)(?=<div\b[^>]*class=(["'])[^"']*\bcc-product-list-item\b[^"']*\bcc-product-list-item--ranking\b[^"']*\3[^>]*>|$)/giu,
    ),
  ];

  const books = [];
  const seenRanks = new Set<number>();

  for (const cardMatch of cards) {
    const card = cardMatch[0];

    const rankValue = card.match(
      /\bdata-item-position=["']([0-9]{1,3})["']/iu,
    )?.[1];
    const rank = rankValue ? Number(rankValue) : Number.NaN;

    if (
      !Number.isInteger(rank)
      || rank < expectedStartRank
      || rank > expectedEndRank
      || seenRanks.has(rank)
    ) {
      continue;
    }

    const titleAnchor = card.match(
      /<a\b[^>]*class=(["'])[^"']*\bcc-title\b[^"']*\1[^>]*>[\s\S]*?<\/a>/iu,
    )?.[0];

    const title = titleAnchor
      ? normalizeText(
          titleAnchor.replace(/^<a\b[^>]*>/iu, "").replace(/<\/a>$/iu, ""),
        )
      : "";

    const href = titleAnchor ? attributeValue(titleAnchor, "href") : "";
    const ean =
      (titleAnchor ? attributeValue(titleAnchor, "data-ean") : "")
      || card.match(/\bdata-ean=["']([0-9A-Za-z_-]+)["']/iu)?.[1]
      || "";

    const authorBlock = card.match(
      /<div\b[^>]*class=(["'])[^"']*\bcc-author\b[^"']*\1[^>]*>([\s\S]*?)<\/div>/iu,
    )?.[2];
    const author = authorBlock
      ? normalizeText(authorBlock).replace(/^di\s+/iu, "").trim()
      : "";

    const ownerBlock = card.match(
      /<span\b[^>]*class=(["'])[^"']*\bcc-owner\b[^"']*\1[^>]*>([\s\S]*?)<\/span>/iu,
    )?.[2];
    const publisher = ownerBlock ? parsePublisher(ownerBlock) : null;

    const imageTag = card.match(
      /<img\b[^>]*class=(["'])[^"']*\bcc-img\b[^"']*\1[^>]*>/iu,
    )?.[0];
    const imageSrc = imageTag ? attributeValue(imageTag, "src") : "";

    if (!title || !href || !ean) {
      throw new Error(`BOOK_INDEX_IBS_INVALID_ITEM:${rank}`);
    }

    books.push({
      sourceKey: ean,
      sourceExternalId: ean,
      title,
      authorName: author || null,
      publisherName: publisher,
      isbn13: isbn13FromEan(ean),
      productUrl: absoluteUrl(href),
      imageUrl: imageSrc ? absoluteUrl(imageSrc) : null,
      rank,
      currency: "EUR",
    });
    seenRanks.add(rank);
  }

  books.sort((left, right) => left.rank - right.rank);

  const expectedCount = expectedEndRank - expectedStartRank + 1;
  if (books.length !== expectedCount) {
    throw new Error(
      `BOOK_INDEX_IBS_PAGE_SIZE_MISMATCH:${expectedStartRank}-${expectedEndRank}:${books.length}`,
    );
  }

  if (
    books.some(
      (book, index) => book.rank !== expectedStartRank + index,
    )
  ) {
    throw new Error(
      `BOOK_INDEX_IBS_RANK_GAP:${expectedStartRank}-${expectedEndRank}`,
    );
  }

  return { books };
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "it-IT,it;q=0.9,en;q=0.6",
      "User-Agent": "IlkOkuBookIndex/0.1 (+https://ilkoku.com)",
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`BOOK_INDEX_SOURCE_HTTP_${response.status}`);
  }

  return response.text();
}

function pageUrl(sourceUrl: string, page: number) {
  const url = new URL(sourceUrl);

  if (
    url.origin !== SOURCE_ORIGIN
    || url.pathname.toLowerCase() !== "/classifica/libri/1day/sold"
  ) {
    throw new Error("BOOK_INDEX_IBS_SOURCE_URL_MISMATCH");
  }

  url.searchParams.set("page", String(page));
  return url.toString();
}

export const ibsItalyBookIndexAdapter: BookIndexSourceAdapter = {
  sourceCode: SOURCE_CODE,
  async collect(
    context: BookIndexCollectionContext,
  ): Promise<BookIndexCollectionResult> {
    if (context.listCode !== "ibs-it-daily") {
      throw new Error("BOOK_INDEX_IBS_LIST_NOT_SUPPORTED");
    }

    const books = [];

    for (let page = 1; page <= PAGE_COUNT; page += 1) {
      const expectedStartRank = (page - 1) * PAGE_SIZE + 1;
      const expectedEndRank = Math.min(
        page * PAGE_SIZE,
        EXPECTED_BOOKS,
      );

      const parsed = parseIbsDailyBestsellerPage(
        await fetchHtml(pageUrl(context.sourceUrl, page)),
        expectedStartRank,
        expectedEndRank,
      );

      books.push(...parsed.books);
    }

    if (books.length !== EXPECTED_BOOKS) {
      throw new Error(
        `BOOK_INDEX_IBS_RESULT_SIZE_MISMATCH:${books.length}`,
      );
    }

    if (books.some((book, index) => book.rank !== index + 1)) {
      throw new Error("BOOK_INDEX_IBS_RANK_ORDER_MISMATCH");
    }

    const sourceKeys = new Set(books.map((book) => book.sourceKey));
    if (sourceKeys.size !== books.length) {
      throw new Error("BOOK_INDEX_IBS_DUPLICATE_SOURCE_KEY");
    }

    return { books };
  },
};
