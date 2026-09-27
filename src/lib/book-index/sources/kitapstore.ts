import type {
  BookIndexCollectionContext,
  BookIndexCollectionResult,
  BookIndexSourceAdapter,
} from "../adapter";
import { decodeBookIndexHtml } from "../html";

const SOURCE_CODE = "kitapstore";
const SOURCE_ORIGIN = "https://www.kitapstore.com";
const PAGE_SIZE = 25;
const FETCH_PAGES = 5;
const MAX_BOOKS = 100;
const VERIFIED_NON_BOOK_PRODUCT_IDS = new Set(["773082"]);

type KitapStoreBook = BookIndexCollectionResult["books"][number];

function absoluteUrl(value: string) {
  return new URL(value, SOURCE_ORIGIN).toString();
}

function priceToMinorUnits(value: string | undefined) {
  const normalized = decodeBookIndexHtml(value ?? "")
    .replace(/\./gu, "")
    .replace(/,/gu, ".")
    .trim();

  if (!/^\d+(?:\.\d{1,2})?$/u.test(normalized)) return null;

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return BigInt(Math.round(amount * 100));
}

function bestsellerListSection(html: string) {
  const heading = html.match(
    /<div\b[^>]*\bclass=["'][^"']*\bIcBaslik\b[^"']*["'][^>]*>\s*ÇOK SATANLAR\s*<\/div>/iu,
  );

  if (!heading || heading.index === undefined) {
    throw new Error("BOOK_INDEX_KITAPSTORE_LIST_HEADING_NOT_FOUND");
  }

  const afterHeading = heading.index + heading[0].length;
  const listStart = html.slice(afterHeading).match(
    /<ul\b[^>]*\bclass=["'][^"']*\bIslemliL\b[^"']*["'][^>]*>/iu,
  );

  if (!listStart || listStart.index === undefined) {
    throw new Error("BOOK_INDEX_KITAPSTORE_LIST_NOT_FOUND");
  }

  const start = afterHeading + listStart.index + listStart[0].length;
  const end = html.indexOf("</ul>", start);
  if (end < 0) {
    throw new Error("BOOK_INDEX_KITAPSTORE_LIST_NOT_FOUND");
  }

  return html.slice(start, end);
}

function itempropTitle(card: string, prop: "author" | "publisher") {
  const value = card.match(
    new RegExp(
      `<span\\b(?=[^>]*\\bitemprop=["']${prop}["'])[^>]*>[\\s\\S]*?<a\\b[^>]*\\btitle=["']([^"']+)["'][^>]*>`,
      "iu",
    ),
  )?.[1];

  return value ? decodeBookIndexHtml(value) : null;
}

export function parseKitapStoreBestsellerPage(
  html: string,
  page: number,
): BookIndexCollectionResult {
  if (!Number.isInteger(page) || page < 1 || page > FETCH_PAGES) {
    throw new Error("BOOK_INDEX_KITAPSTORE_INVALID_PAGE");
  }

  const section = bestsellerListSection(html);
  const starts = [
    ...section.matchAll(
      /<li\b(?=[^>]*\bitemtype=["']http:\/\/schema\.org\/Book["'])(?=[^>]*\bid=["']Urun-([0-9]+)["'])[^>]*>/giu,
    ),
  ];

  if (starts.length !== PAGE_SIZE) {
    throw new Error("BOOK_INDEX_KITAPSTORE_PAGE_SIZE_INVALID");
  }

  const books = starts.map((match, index) => {
    const start = match.index ?? 0;
    const end = starts[index + 1]?.index ?? section.length;
    const card = section.slice(start, end);
    const productId = match[1]?.trim() ?? "";

    const titleLink = card.match(
      /<div\b[^>]*\bclass=["'][^"']*\bUrunAdi\b[^"']*["'][^>]*>[\s\S]*?<a\b(?=[^>]*\bhref=["']([^"']+)["'])(?=[^>]*\btitle=["']([^"']+)["'])(?=[^>]*\bitemprop=["']url["'])[^>]*>/iu,
    );
    const image = card.match(
      /<img\b(?=[^>]*\bclass=["'][^"']*\bUG\b[^"']*["'])(?=[^>]*\bsrc=["']([^"']+)["'])(?=[^>]*\bitemprop=["']image["'])[^>]*>/iu,
    )?.[1];
    const price = card.match(
      /<meta\b(?=[^>]*\bcontent=["']([^"']+)["'])(?=[^>]*\bitemprop=["']price["'])[^>]*>/iu,
    )?.[1];
    const currency = card.match(
      /<meta\b(?=[^>]*\bcontent=["']([^"']+)["'])(?=[^>]*\bitemprop=["']priceCurrency["'])[^>]*>/iu,
    )?.[1];
    const serialNumber = card.match(
      /<meta\b(?=[^>]*\bcontent=["']([^"']+)["'])(?=[^>]*\bitemprop=["']serialNumber["'])[^>]*>/iu,
    )?.[1];

    const productUrl = titleLink?.[1]?.trim() ?? "";
    const title = titleLink?.[2]
      ? decodeBookIndexHtml(titleLink[2])
      : "";

    if (
      !productId ||
      !productUrl ||
      !title ||
      !serialNumber ||
      serialNumber !== productId
    ) {
      throw new Error("BOOK_INDEX_KITAPSTORE_INVALID_ITEM");
    }

    return {
      sourceKey: productId,
      sourceExternalId: productId,
      title,
      authorName: itempropTitle(card, "author"),
      publisherName: itempropTitle(card, "publisher"),
      productUrl: absoluteUrl(productUrl),
      imageUrl: image ? absoluteUrl(image) : null,
      rank: (page - 1) * PAGE_SIZE + index + 1,
      priceAmount: priceToMinorUnits(price),
      currency: currency ? decodeBookIndexHtml(currency) : "TRY",
    } satisfies KitapStoreBook;
  });

  const uniqueKeys = new Set(books.map((book) => book.sourceKey));
  if (uniqueKeys.size !== books.length) {
    throw new Error("BOOK_INDEX_KITAPSTORE_DUPLICATE_SOURCE_KEY");
  }

  if (
    books.some(
      (book, index) =>
        book.rank !== (page - 1) * PAGE_SIZE + index + 1,
    )
  ) {
    throw new Error("BOOK_INDEX_KITAPSTORE_PAGE_RANK_GAP");
  }

  return { books };
}

export function combineKitapStoreBestsellerPages(
  pages: BookIndexCollectionResult[],
): BookIndexCollectionResult {
  if (pages.length !== FETCH_PAGES) {
    throw new Error("BOOK_INDEX_KITAPSTORE_PAGE_COUNT_INVALID");
  }

  const rawBooks = pages.flatMap((page) => page.books).sort(
    (left, right) => left.rank - right.rank,
  );

  if (rawBooks.length !== FETCH_PAGES * PAGE_SIZE) {
    throw new Error("BOOK_INDEX_KITAPSTORE_RESULT_TOO_SMALL");
  }

  const sourceKeys = new Set(rawBooks.map((book) => book.sourceKey));
  if (sourceKeys.size !== rawBooks.length) {
    throw new Error("BOOK_INDEX_KITAPSTORE_DUPLICATE_SOURCE_KEY");
  }

  if (rawBooks.some((book, index) => book.rank !== index + 1)) {
    throw new Error("BOOK_INDEX_KITAPSTORE_RANK_GAP");
  }

  const books = rawBooks
    .filter(
      (book) =>
        !VERIFIED_NON_BOOK_PRODUCT_IDS.has(book.sourceExternalId ?? ""),
    )
    .slice(0, MAX_BOOKS)
    .map((book, index) => ({
      ...book,
      rank: index + 1,
    }));

  if (books.length !== MAX_BOOKS) {
    throw new Error("BOOK_INDEX_KITAPSTORE_RESULT_TOO_SMALL");
  }

  return { books };
}

function pageUrl(sourceUrl: string, page: number) {
  if (page === 1) return sourceUrl;

  return new URL(
    `/liste/2/cok-satanlar/!Sayfa=${page}&Siralama=&GosterimSayisi=25&Satista=0&`,
    SOURCE_ORIGIN,
  ).toString();
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.5",
      "User-Agent": "IlkOkuBookIndex/0.1 (+https://ilkoku.com)",
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`BOOK_INDEX_SOURCE_HTTP_${response.status}`);
  }

  return response.text();
}

export const kitapStoreBookIndexResearchAdapter: BookIndexSourceAdapter = {
  sourceCode: SOURCE_CODE,
  async collect(
    context: BookIndexCollectionContext,
  ): Promise<BookIndexCollectionResult> {
    const pages: BookIndexCollectionResult[] = [];

    for (let page = 1; page <= FETCH_PAGES; page += 1) {
      pages.push(
        parseKitapStoreBestsellerPage(
          await fetchHtml(pageUrl(context.sourceUrl, page)),
          page,
        ),
      );
    }

    return combineKitapStoreBestsellerPages(pages);
  },
};
