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
const MAX_IDENTITY_ENRICHMENTS = 8;
const DETAIL_CONCURRENCY = 3;
// Verified current bestseller-surface exceptions:
// 776749 = Socrates Dergi No:99 (Dergi category)
// 773082 = Naber Defter Özel Edisyon / Naber Sayı 17 (magazine issue special edition)
const VERIFIED_NON_BOOK_PRODUCT_IDS = new Set(["776749", "773082"]);

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

function parseCard(
  card: string,
  productId: string,
  fallbackRank?: number,
) {
  const rankValue = card.match(
    /<div\b[^>]*class=["'][^"']*\bNo\b[^"']*["'][^>]*>\s*([0-9]{1,3})\s*<\/div>/iu,
  )?.[1];
  const rank = rankValue ? Number(rankValue) : fallbackRank ?? Number.NaN;

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

  if (!Number.isInteger(rank) || rank < 1 || rank > MAX_BOOKS) {
    throw new Error("BOOK_INDEX_KITAPSTORE_INVALID_RANK");
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
): BookIndexCollectionResult {
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
    );
  });

  const sourceKeys = new Set(books.map((book) => book.sourceKey));
  const productUrls = new Set(books.map((book) => book.productUrl));

  if (sourceKeys.size !== books.length) {
    throw new Error("BOOK_INDEX_KITAPSTORE_DUPLICATE_SOURCE_KEY");
  }

  if (productUrls.size !== books.length) {
    throw new Error("BOOK_INDEX_KITAPSTORE_DUPLICATE_PRODUCT_URL");
  }

  if (
    books.some((book, index) => {
      if (index === 0) return false;
      const previousRank = books[index - 1]?.rank ?? 0;
      return book.rank < previousRank || book.rank > previousRank + 1;
    })
  ) {
    throw new Error("BOOK_INDEX_KITAPSTORE_RANK_SEQUENCE_MISMATCH");
  }

  return { books };
}

export function parseKitapStoreNewReleasePage(
  html: string,
  rankOffset = 0,
): BookIndexCollectionResult {
  const headings = [
    ...html.matchAll(
      /<div\b[^>]*class=["'][^"']*\bIcBaslik\b[^"']*["'][^>]*>\s*YENİ\s+ÇIKANLAR\s*<\/div>/giu,
    ),
  ];
  const headingIndex = headings.at(-1)?.index;

  if (headingIndex === undefined) {
    throw new Error("BOOK_INDEX_KITAPSTORE_NEW_RELEASE_HEADING_MISSING");
  }

  const afterHeading = html.slice(headingIndex);
  const listBody = afterHeading.match(
    /<ul\b[^>]*class=["'][^"']*\bIslemliL\b[^"']*["'][^>]*>([\s\S]*?)<\/ul>/iu,
  )?.[1];

  if (!listBody) {
    throw new Error("BOOK_INDEX_KITAPSTORE_NEW_RELEASE_LIST_MISSING");
  }

  const starts = [
    ...listBody.matchAll(
      /<li\b(?=[^>]*\bitemtype=["']http:\/\/schema\.org\/Book["'])(?=[^>]*\bid=["']Urun-([0-9]+)["'])[^>]*>/giu,
    ),
  ];

  if (starts.length !== EXPECTED_PAGE_BOOKS) {
    throw new Error("BOOK_INDEX_KITAPSTORE_NEW_RELEASE_PAGE_SIZE_MISMATCH");
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
      rankOffset + index + 1,
    );
  });

  const sourceKeys = new Set(books.map((book) => book.sourceKey));
  const productUrls = new Set(books.map((book) => book.productUrl));

  if (sourceKeys.size !== books.length) {
    throw new Error("BOOK_INDEX_KITAPSTORE_DUPLICATE_SOURCE_KEY");
  }

  if (productUrls.size !== books.length) {
    throw new Error("BOOK_INDEX_KITAPSTORE_DUPLICATE_PRODUCT_URL");
  }

  return { books };
}

export function combineKitapStoreNewReleasePages(
  pages: BookIndexCollectionResult[],
): BookIndexCollectionResult {
  if (pages.length !== PAGE_COUNT) {
    throw new Error("BOOK_INDEX_KITAPSTORE_NEW_RELEASE_PAGE_COUNT_MISMATCH");
  }

  const books = pages.flatMap((page) => page.books);

  if (books.length !== MAX_BOOKS) {
    throw new Error("BOOK_INDEX_KITAPSTORE_NEW_RELEASE_RESULT_SIZE_MISMATCH");
  }

  const sourceKeys = new Set(books.map((book) => book.sourceKey));
  const productUrls = new Set(books.map((book) => book.productUrl));

  if (sourceKeys.size !== books.length) {
    throw new Error("BOOK_INDEX_KITAPSTORE_DUPLICATE_SOURCE_KEY");
  }

  if (productUrls.size !== books.length) {
    throw new Error("BOOK_INDEX_KITAPSTORE_DUPLICATE_PRODUCT_URL");
  }

  if (
    books.some(
      (book, index) => book.rank !== index + 1,
    )
  ) {
    throw new Error("BOOK_INDEX_KITAPSTORE_NEW_RELEASE_ORDER_MISMATCH");
  }

  return { books };
}

export function combineKitapStoreBestsellerPages(
  pages: BookIndexCollectionResult[],
): BookIndexCollectionResult {
  if (pages.length !== PAGE_COUNT) {
    throw new Error("BOOK_INDEX_KITAPSTORE_PAGE_COUNT_MISMATCH");
  }

  // Keep source/page order intact. KitapStore can publish multiple products
  // at the same native rank; sorting or ordinal re-ranking would destroy that
  // source semantics.
  const books = pages.flatMap((page) => page.books);

  if (books.length !== MAX_BOOKS) {
    throw new Error("BOOK_INDEX_KITAPSTORE_RESULT_SIZE_MISMATCH");
  }

  const sourceKeys = new Set(books.map((book) => book.sourceKey));
  const productUrls = new Set(books.map((book) => book.productUrl));

  if (sourceKeys.size !== books.length) {
    throw new Error("BOOK_INDEX_KITAPSTORE_DUPLICATE_SOURCE_KEY");
  }

  if (productUrls.size !== books.length) {
    throw new Error("BOOK_INDEX_KITAPSTORE_DUPLICATE_PRODUCT_URL");
  }

  if (books[0]?.rank !== 1) {
    throw new Error("BOOK_INDEX_KITAPSTORE_RANK_SEQUENCE_MISMATCH");
  }

  // Dense native ranking is valid: ties may repeat a rank, while the next
  // distinct rank may advance by exactly one. Reject decreases and gaps.
  if (
    books.some((book, index) => {
      if (index === 0) return false;
      const previousRank = books[index - 1]?.rank ?? 0;
      return book.rank < previousRank || book.rank > previousRank + 1;
    })
  ) {
    throw new Error("BOOK_INDEX_KITAPSTORE_RANK_SEQUENCE_MISMATCH");
  }

  // Validate the complete native Top 100 first, then exclude only explicitly
  // verified non-book products. Preserve native ranks; never renumber gaps.
  return {
    books: books.filter(
      (book) => !VERIFIED_NON_BOOK_PRODUCT_IDS.has(book.sourceKey),
    ),
  };
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

export function parseKitapStoreProductAuthorName(html: string) {
  const relatedAuthorStart = html.search(
    /<div\b[^>]*class=["'][^"']*\bKisiAdi\b[^"']*["'][^>]*>/iu,
  );
  const productHtml =
    relatedAuthorStart >= 0 ? html.slice(0, relatedAuthorStart) : html;

  const names = [
    ...productHtml.matchAll(
      /<a\b(?=[^>]*\bhref=["']\/kisi\/[^"']+["'])(?=[^>]*\bitemprop=["']url["'])[^>]*>([\s\S]*?)<\/a>/giu,
    ),
  ]
    .map((match) =>
      (
        attributeValue(match[0], "title")
        || decodeBookIndexHtml(match[1] ?? "")
      )
        .replace(/<[^>]+>/gu, " ")
        .replace(/\s+/gu, " ")
        .trim(),
    )
    .filter(Boolean);

  const uniqueNames = [...new Set(names)];
  return uniqueNames.length ? uniqueNames.join(", ") : null;
}

async function enrichMissingAuthorIdentity(
  result: BookIndexCollectionResult,
): Promise<BookIndexCollectionResult> {
  const candidates = result.books
    .map((book, index) => ({ book, index }))
    .filter(({ book }) => !book.authorName);

  if (candidates.length === 0) return result;

  if (candidates.length > MAX_IDENTITY_ENRICHMENTS) {
    throw new Error("BOOK_INDEX_KITAPSTORE_IDENTITY_ENRICHMENT_TOO_LARGE");
  }

  const detailByIndex = new Map<
    number,
    { isbn13: string | null; authorName: string | null }
  >();
  let nextCandidate = 0;

  const workers = Array.from(
    { length: Math.min(DETAIL_CONCURRENCY, candidates.length) },
    async () => {
      while (true) {
        const candidateIndex = nextCandidate;
        nextCandidate += 1;
        if (candidateIndex >= candidates.length) return;

        const candidate = candidates[candidateIndex];
        const html = await fetchHtml(candidate.book.productUrl);
        const isbn13 = parseKitapStoreProductIsbn13(html);
        const authorName = parseKitapStoreProductAuthorName(html);

        if (!isbn13 && !authorName) {
          throw new Error("BOOK_INDEX_KITAPSTORE_IDENTITY_METADATA_MISSING");
        }

        detailByIndex.set(candidate.index, {
          isbn13,
          authorName,
        });
      }
    },
  );

  await Promise.all(workers);

  return {
    books: result.books.map((book, index) => {
      const detail = detailByIndex.get(index);
      if (!detail) return book;

      return {
        ...book,
        authorName: detail.authorName || book.authorName || null,
        isbn13: detail.isbn13 || book.isbn13 || null,
      };
    }),
  };
}

function pageUrl(page: number) {
  return `${SOURCE_ORIGIN}/liste/2/cok-satanlar/!Sayfa=${page}`;
}

function newReleasePageUrl(page: number) {
  return `${SOURCE_ORIGIN}/liste/1/yeni-cikanlar/!Sayfa=${page}`;
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
    if (context.listCode === "kitapstore-tr-new-releases") {
      const htmlPages = await Promise.all(
        Array.from(
          { length: PAGE_COUNT },
          (_, index) => fetchHtml(newReleasePageUrl(index + 1)),
        ),
      );

      return enrichMissingAuthorIdentity(
        combineKitapStoreNewReleasePages(
          htmlPages.map((html, index) =>
            parseKitapStoreNewReleasePage(
              html,
              index * EXPECTED_PAGE_BOOKS,
            ),
          ),
        ),
      );
    }

    if (
      context.listCode !== "kitapstore-tr-live" &&
      context.listCode !== "kitapstore-tr-live-canary"
    ) {
      throw new Error("BOOK_INDEX_KITAPSTORE_LIST_NOT_SUPPORTED");
    }

    const htmlPages = await Promise.all(
      Array.from({ length: PAGE_COUNT }, (_, index) => fetchHtml(pageUrl(index + 1))),
    );

    const combined = combineKitapStoreBestsellerPages(
      htmlPages.map((html) =>
        parseKitapStoreBestsellerPage(html),
      ),
    );

    return enrichMissingAuthorIdentity(combined);
  },
};
