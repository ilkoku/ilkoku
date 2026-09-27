import type {
  BookIndexCollectionContext,
  BookIndexCollectionResult,
  BookIndexSourceAdapter,
} from "../adapter";
import { decodeBookIndexHtml } from "../html";

const SOURCE_CODE = "idefix";
const SOURCE_ORIGIN = "https://www.idefix.com";
const MIN_EXPECTED_ORGANIC_BOOKS = 15;
const DETAIL_CONCURRENCY = 6;

type IdefixCategory = {
  id?: unknown;
  name?: unknown;
};

type IdefixVariant = {
  id?: unknown;
  name?: unknown;
  originalName?: unknown;
  authorName?: unknown;
  handleUrl?: unknown;
  isSponsored?: unknown;
  price?: unknown;
  discountedSalesPrice?: unknown;
  images?: unknown;
};

type IdefixItem = {
  name?: unknown;
  originalName?: unknown;
  authorName?: unknown;
  brandName?: unknown;
  categoryTree?: unknown;
  variants?: unknown;
};

type IdefixNextData = {
  props?: {
    pageProps?: {
      landingData?: {
        success?: unknown;
        items?: unknown;
      };
    };
  };
};

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function priceToMinorUnits(value: unknown) {
  const amount = numberValue(value);
  if (amount === null || amount < 0) return null;
  return BigInt(Math.round(amount * 100));
}

function firstImage(value: unknown) {
  if (!Array.isArray(value)) return null;
  const first = value.find(
    (entry) =>
      entry &&
      typeof entry === "object" &&
      typeof (entry as { src?: unknown }).src === "string",
  ) as { src?: unknown } | undefined;

  const src = stringValue(first?.src);
  if (!src || src.includes("{size}")) return null;
  return src;
}

function isBookItem(item: IdefixItem) {
  if (!Array.isArray(item.categoryTree)) return false;

  return item.categoryTree.some((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const category = entry as IdefixCategory;
    return category.id === 3307 || stringValue(category.name) === "Kitap";
  });
}

function extractNextData(html: string): IdefixNextData {
  const match = html.match(
    /<script\b[^>]*\bid=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/iu,
  );
  if (!match?.[1]) {
    throw new Error("BOOK_INDEX_IDEFIX_NEXT_DATA_NOT_FOUND");
  }

  try {
    return JSON.parse(match[1]) as IdefixNextData;
  } catch {
    throw new Error("BOOK_INDEX_IDEFIX_NEXT_DATA_INVALID");
  }
}


type IdefixProductDetail = {
  authorName: string | null;
  isbn13: string | null;
};

function validIsbn13(value: string | undefined) {
  const normalized = (value ?? "").replace(/[^0-9]/gu, "");
  return /^(?:978|979)[0-9]{10}$/u.test(normalized) ? normalized : null;
}

function detailAuthorName(text: string) {
  const match = text.match(
    /\bYazar\s*:\s*(.+?)(?=\s+(?:(?:Çevirmen|Editör|Hazırlayan|Yayına Hazırlayan|Derleyen|Çizer|Çizimler|Resimleyen|Kapak|Yayınevi|ISBN-13|Basım Yılı|Baskı Yılı|Sayfa Sayısı|Kağıt Türü|Ebat|Dil|Cilt Durumu)\s*:|Neden\s+idefix\b)|$)/iu,
  );

  return match?.[1]?.trim() || null;
}

function htmlTagText(html: string, tagName: "title" | "h1") {
  const match = html.match(
    new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "iu"),
  );

  return match?.[1] ? decodeBookIndexHtml(match[1]) : "";
}

function documentTitleAuthorName(html: string) {
  const title = htmlTagText(html, "title");
  const match = title.match(
    /\s+-\s+(.+?)\s+Kitabı(?:\s+Fiyatları)?\s*&?\s*Satın\s+Al(?:\s*\|.*)?$/iu,
  );

  return match?.[1]?.trim() || null;
}

function headingAuthorName(html: string, expectedTitle: string) {
  const title = decodeBookIndexHtml(expectedTitle);
  const heading = htmlTagText(html, "h1");

  if (!title || !heading.startsWith(title)) return null;

  const suffix = heading.slice(title.length).trim();

  if (
    !suffix
    || suffix.length > 120
    || !/\p{L}/u.test(suffix)
    || /^(?:Sepette|Ürün|TL\b)/iu.test(suffix)
  ) {
    return null;
  }

  return suffix;
}

export function parseIdefixProductDetails(
  html: string,
  expectedTitle = "",
): IdefixProductDetail {
  const text = decodeBookIndexHtml(html);
  const isbn = text.match(
    /\bISBN-13\s*:\s*((?:978|979)[0-9\s-]{10,20})/iu,
  )?.[1];

  return {
    authorName:
      detailAuthorName(text)
      || documentTitleAuthorName(html)
      || headingAuthorName(html, expectedTitle),
    isbn13: validIsbn13(isbn),
  };
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "IlkOkuBookIndex/0.1 (+https://ilkoku.com)",
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`BOOK_INDEX_SOURCE_HTTP_${response.status}`);
  }

  return response.text();
}

async function enrichBooks(
  books: BookIndexCollectionResult["books"],
): Promise<BookIndexCollectionResult["books"]> {
  const details = new Array<IdefixProductDetail>(books.length);
  let nextIndex = 0;

  const workers = Array.from(
    { length: Math.min(DETAIL_CONCURRENCY, books.length) },
    async () => {
      while (true) {
        const index = nextIndex;
        nextIndex += 1;
        if (index >= books.length) return;

        details[index] = parseIdefixProductDetails(
          await fetchHtml(books[index].productUrl),
          books[index].title,
        );
      }
    },
  );

  await Promise.all(workers);

  const enrichedBooks = books.map((book, index) => {
    const detail = details[index];
    const authorName = book.authorName || detail?.authorName || null;
    const isbn13 = detail?.isbn13 || book.isbn13 || null;

    return {
      ...book,
      authorName,
      isbn13,
    };
  });

  const identifiedBookCount = enrichedBooks.filter(
    (book) => Boolean(book.authorName || book.isbn13 || book.isbn10),
  ).length;

  if (identifiedBookCount === 0) {
    throw new Error("BOOK_INDEX_IDEFIX_DETAIL_METADATA_MISSING");
  }

  return enrichedBooks;
}

export function parseIdefixBestsellers(
  html: string,
): BookIndexCollectionResult {
  const nextData = extractNextData(html);
  const landingData = nextData.props?.pageProps?.landingData;

  if (!landingData || landingData.success !== true) {
    throw new Error("BOOK_INDEX_IDEFIX_LANDING_NOT_READY");
  }

  if (!Array.isArray(landingData.items)) {
    throw new Error("BOOK_INDEX_IDEFIX_ITEMS_NOT_FOUND");
  }

  const organicBooks = landingData.items.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];

    const item = raw as IdefixItem;
    if (!isBookItem(item) || !Array.isArray(item.variants)) return [];

    const variant = item.variants[0];
    if (!variant || typeof variant !== "object") return [];

    const sourceVariant = variant as IdefixVariant;
    if (sourceVariant.isSponsored === true) return [];

    const externalId =
      typeof sourceVariant.id === "number" || typeof sourceVariant.id === "string"
        ? String(sourceVariant.id)
        : "";
    const handleUrl = stringValue(sourceVariant.handleUrl);
    const title =
      stringValue(sourceVariant.originalName) ||
      stringValue(sourceVariant.name) ||
      stringValue(item.originalName) ||
      stringValue(item.name);

    if (!externalId || !handleUrl.startsWith("/") || !title) {
      throw new Error("BOOK_INDEX_IDEFIX_INVALID_ITEM");
    }

    return [
      {
        sourceKey: externalId,
        sourceExternalId: externalId,
        title,
        authorName:
          stringValue(sourceVariant.authorName) ||
          stringValue(item.authorName) ||
          null,
        publisherName: stringValue(item.brandName) || null,
        productUrl: new URL(handleUrl, SOURCE_ORIGIN).toString(),
        imageUrl: firstImage(sourceVariant.images),
        rank: 0,
        priceAmount: priceToMinorUnits(
          sourceVariant.discountedSalesPrice ?? sourceVariant.price,
        ),
        currency: "TRY",
      },
    ];
  });

  if (organicBooks.length < MIN_EXPECTED_ORGANIC_BOOKS) {
    throw new Error("BOOK_INDEX_IDEFIX_RESULT_TOO_SMALL");
  }

  const books = organicBooks.map((book, index) => ({
    ...book,
    // idefix can inject sponsored cards into the landing. Those cards are not
    // permitted to influence İlkOku's organic source vote, so the remaining
    // organic order is ranked contiguously.
    rank: index + 1,
  }));

  if (new Set(books.map((book) => book.sourceKey)).size !== books.length) {
    throw new Error("BOOK_INDEX_IDEFIX_DUPLICATE_SOURCE_KEY");
  }

  return { books };
}

export const idefixBookIndexAdapter: BookIndexSourceAdapter = {
  sourceCode: SOURCE_CODE,
  async collect(
    context: BookIndexCollectionContext,
  ): Promise<BookIndexCollectionResult> {
    const parsed = parseIdefixBestsellers(
      await fetchHtml(context.sourceUrl),
    );

    return {
      books: await enrichBooks(parsed.books),
    };
  },
};
