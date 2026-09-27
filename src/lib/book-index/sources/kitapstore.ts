import type {
  BookIndexCollectionContext,
  BookIndexCollectionResult,
  BookIndexSourceAdapter,
} from "../adapter";
import { decodeBookIndexHtml } from "../html";

const SOURCE_CODE = "kitapstore";
const SOURCE_ORIGIN = "https://www.kitapstore.com";
const PAGE_COUNT = 4;
const EXPECTED_PAGE_BOOKS = 25;
const MAX_BOOKS = PAGE_COUNT * EXPECTED_PAGE_BOOKS;

function absoluteUrl(value: string) {
  return new URL(value, SOURCE_ORIGIN).toString();
}

function attributeValue(fragment: string, name: string) {
  const match = fragment.match(
    new RegExp(`\\b${name}=(["'])([\\s\\S]*?)\\1`, "iu"),
  );
  return match?.[2] ? decodeBookIndexHtml(match[2]) : "";
}

function priceToMinorUnits(value: string | undefined) {
  const normalized = decodeBookIndexHtml(value ?? "")
    .replace(/\./gu, "")
    .replace(",", ".")
    .trim();

  if (!/^[0-9]+(?:\.[0-9]{1,2})?$/u.test(normalized)) return null;

  const [whole, fraction = ""] = normalized.split(".");
  return BigInt(whole) * BigInt(100) + BigInt((fraction + "00").slice(0, 2));
}

function itemPropTag(card: string, tagName: "meta" | "span", itemProp: string) {
  return card.match(
    new RegExp(
      `<${tagName}\\b(?=[^>]*\\bitemprop=["']${itemProp}["'])[^>]*>`,
      "iu",
    ),
  )?.[0];
}

function anchorValueFromClass(card: string, classToken: "KisiAdi" | "FirmaAdi") {
  const section = card.match(
    new RegExp(
      `<div\\b[^>]*class=["'][^"']*\\b${classToken}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/div>`,
      "iu",
    ),
  )?.[1];
  const anchor = section?.match(/<a\b[^>]*>([\s\S]*?)<\/a>/iu);

  if (!anchor) return null;

  return (
    attributeValue(anchor[0], "title") ||
    decodeBookIndexHtml(anchor[1] ?? "") ||
    null
  );
}

function parseCard(card: string, productId: string, expectedRank: number) {
  const rankValue = card.match(
    /<div\b[^>]*class=["'][^"']*\bNo\b[^"']*["'][^>]*>\s*([0-9]{1,3})\s*<\/div>/iu,
  )?.[1];
  const rank = rankValue ? Number(rankValue) : Number.NaN;

  const titleSection = card.match(
    /<div\b[^>]*class=["'][^"']*\bUrunAdi\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/iu,
  )?.[1];
  const titleLink = titleSection?.match(
    /<a\b(?=[^>]*\bitemprop=["']url["'])[^>]*>([\s\S]*?)<\/a>/iu,
  );
  const titleTag = titleLink?.[0] ?? "";
  const productHref = attributeValue(titleTag, "href");
  const title =
    attributeValue(titleTag, "title") ||
    decodeBookIndexHtml(titleLink?.[1] ?? "");

  const author = anchorValueFromClass(card, "KisiAdi");
  const publisher = anchorValueFromClass(card, "FirmaAdi");

  const imageTag = card.match(
    /<img\b(?=[^>]*\bitemprop=["']image["'])[^>]*>/iu,
  )?.[0];
  const imageSrc = imageTag ? attributeValue(imageTag, "src") : "";

  const priceTag = itemPropTag(card, "meta", "price");
  const priceCurrencyTag = itemPropTag(card, "meta", "priceCurrency");
  const serialNumberTag = itemPropTag(card, "meta", "serialNumber");
  const serialNumber = serialNumberTag
    ? attributeValue(serialNumberTag, "content")
    : "";
  const priceCurrency = priceCurrencyTag
    ? attributeValue(priceCurrencyTag, "content")
    : "";

  if (!Number.isInteger(rank) || rank !== expectedRank) {
    throw new Error("BOOK_INDEX_KITAPSTORE_RANK_MISMATCH");
  }
  if (!productHref) {
    throw new Error("BOOK_INDEX_KITAPSTORE_PRODUCT_URL_MISSING");
  }
  if (!title) {
    throw new Error("BOOK_INDEX_KITAPSTORE_TITLE_MISSING");
  }
  if (serialNumber !== productId) {
    throw new Error("BOOK_INDEX_KITAPSTORE_SERIAL_MISMATCH");
  }
  if (!new RegExp(`/urun/${productId}/`, "u").test(productHref)) {
    throw new Error("BOOK_INDEX_KITAPSTORE_PRODUCT_URL_ID_MISMATCH");
  }
  if (priceCurrency !== "TRY") {
    throw new Error("BOOK_INDEX_KITAPSTORE_CURRENCY_MISMATCH");
  }

  return {
    sourceKey: productId,
    sourceExternalId: productId,
    title,
    authorName: author,
    publisherName: publisher,
    productUrl: absoluteUrl(productHref),
    imageUrl: imageSrc ? absoluteUrl(imageSrc) : null,
    rank,
    priceAmount: priceToMinorUnits(
      priceTag ? attributeValue(priceTag, "content") : undefined,
    ),
    currency: "TRY",
  };
}

export function parseKitapStoreBestsellerPage(
  html: string,
  expectedStartRank: number,
): BookIndexCollectionResult {
  if (!Number.isInteger(expectedStartRank) || expectedStartRank < 1) {
    throw new Error("BOOK_INDEX_KITAPSTORE_INVALID_EXPECTED_RANK");
  }

  const headings = [
    ...html.matchAll(
      /<div\b[^>]*class=["'][^"']*\bIcBaslik\b[^"']*["'][^>]*>\s*ÇOK\s+SATANLAR\s*<\/div>/giu,
    ),
  ];
  const headingIndex = headings.at(-1)?.index;

  if (headingIndex === undefined) {
    throw new Error("BOOK_INDEX_KITAPSTORE_BESTSELLER_HEADING_MISSING");
  }

  const afterHeading = html.slice(headingIndex);
  const listBody = afterHeading.match(
    /<ul\b[^>]*class=["'][^"']*\bIslemliL\b[^"']*["'][^>]*>([\s\S]*?)<\/ul>/iu,
  )?.[1];

  if (!listBody) {
    throw new Error("BOOK_INDEX_KITAPSTORE_BESTSELLER_LIST_MISSING");
  }

  const starts = [
    ...listBody.matchAll(
      /<li\b(?=[^>]*\bitemtype=["']http:\/\/schema\.org\/Book["'])(?=[^>]*\bid=["']Urun-([0-9]+)["'])[^>]*>/giu,
    ),
  ];

  if (starts.length !== EXPECTED_PAGE_BOOKS) {
    throw new Error("BOOK_INDEX_KITAPSTORE_PAGE_SIZE_MISMATCH");
  }

  const books = starts.map((match, index) => {
    const productId = match[1]?.trim() ?? "";
    const start = match.index ?? 0;
    const end = starts[index + 1]?.index ?? listBody.length;

    if (!productId) {
      throw new Error("BOOK_INDEX_KITAPSTORE_INVALID_ITEM");
    }

    return parseCard(
      listBody.slice(start, end),
      productId,
      expectedStartRank + index,
    );
  });

  const sourceKeys = new Set(books.map((book) => book.sourceKey));
  const productUrls = new Set(books.map((book) => book.productUrl));
  const ranks = new Set(books.map((book) => book.rank));

  if (sourceKeys.size !== books.length) {
    throw new Error("BOOK_INDEX_KITAPSTORE_DUPLICATE_SOURCE_KEY");
  }

  if (productUrls.size !== books.length) {
    throw new Error("BOOK_INDEX_KITAPSTORE_DUPLICATE_PRODUCT_URL");
  }

  if (ranks.size !== books.length) {
    throw new Error("BOOK_INDEX_KITAPSTORE_DUPLICATE_RANK");
  }

  return { books };
}

export function combineKitapStoreBestsellerPages(
  pages: BookIndexCollectionResult[],
): BookIndexCollectionResult {
  if (pages.length !== PAGE_COUNT) {
    throw new Error("BOOK_INDEX_KITAPSTORE_PAGE_COUNT_MISMATCH");
  }

  const books = pages.flatMap((page) => page.books).sort(
    (left, right) => left.rank - right.rank,
  );

  if (books.length !== MAX_BOOKS) {
    throw new Error("BOOK_INDEX_KITAPSTORE_RESULT_SIZE_MISMATCH");
  }

  const sourceKeys = new Set(books.map((book) => book.sourceKey));
  const productUrls = new Set(books.map((book) => book.productUrl));
  const ranks = new Set(books.map((book) => book.rank));

  if (sourceKeys.size !== books.length) {
    throw new Error("BOOK_INDEX_KITAPSTORE_DUPLICATE_SOURCE_KEY");
  }

  if (productUrls.size !== books.length) {
    throw new Error("BOOK_INDEX_KITAPSTORE_DUPLICATE_PRODUCT_URL");
  }

  if (ranks.size !== books.length) {
    throw new Error("BOOK_INDEX_KITAPSTORE_DUPLICATE_RANK");
  }

  if (books.some((book, index) => book.rank !== index + 1)) {
    throw new Error("BOOK_INDEX_KITAPSTORE_RANK_GAP");
  }

  return { books };
}

export function parseKitapStoreProductIsbn13(html: string) {
  const isbnTag = itemPropTag(html, "span", "isbn");
  if (!isbnTag) return null;

  const body = html.match(
    /<span\b(?=[^>]*\bitemprop=["']isbn["'])[^>]*>([\s\S]*?)<\/span>/iu,
  )?.[1];
  const normalized = decodeBookIndexHtml(body ?? "").replace(/[^0-9]/gu, "");

  return /^(?:978|979)[0-9]{10}$/u.test(normalized) ? normalized : null;
}

function pageUrl(page: number) {
  return `${SOURCE_ORIGIN}/liste/2/cok-satanlar/!Sayfa=${page}`;
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
    if (context.listCode !== "kitapstore-tr-live") {
      throw new Error("BOOK_INDEX_KITAPSTORE_LIST_NOT_SUPPORTED");
    }

    const htmlPages = await Promise.all(
      Array.from({ length: PAGE_COUNT }, (_, index) => fetchHtml(pageUrl(index + 1))),
    );

    return combineKitapStoreBestsellerPages(
      htmlPages.map((html, index) =>
        parseKitapStoreBestsellerPage(
          html,
          index * EXPECTED_PAGE_BOOKS + 1,
        ),
      ),
    );
  },
};
