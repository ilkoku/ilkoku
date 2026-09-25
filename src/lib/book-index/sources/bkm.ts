import type {
  BookIndexCollectionContext,
  BookIndexCollectionResult,
  BookIndexSourceAdapter,
} from "../adapter";

const SOURCE_CODE = "bkm";
const ENDPOINT = "https://bkm-best.wawlabs.com/top_sellers";
const MAX_BOOKS = 50;
const MIN_EXPECTED_BOOKS = 50;

type BkmSpan = "week" | "month" | "year";

type BkmItem = {
  product_code?: unknown;
  product_id?: unknown;
  title?: unknown;
  link?: unknown;
  image?: unknown;
  sale_price?: unknown;
  brand?: unknown;
  writer?: unknown;
  gtin?: unknown;
  ix?: unknown;
};

type BkmResponse = {
  total_item_count?: unknown;
  res?: unknown;
};

function spanForList(listCode: string): BkmSpan {
  switch (listCode) {
    case "bkm-tr-weekly":
      return "week";
    case "bkm-tr-monthly":
      return "month";
    case "bkm-tr-yearly":
      return "year";
    default:
      throw new Error("BOOK_INDEX_BKM_LIST_NOT_SUPPORTED");
  }
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isbn13(value: unknown) {
  const normalized = stringValue(value).replace(/[^0-9]/gu, "");
  return /^[0-9]{13}$/u.test(normalized) ? normalized : null;
}

function priceToMinorUnits(value: unknown) {
  const normalized = stringValue(value).replace(/\./gu, "").replace(",", ".");
  if (!/^[0-9]+(?:\.[0-9]{1,2})?$/u.test(normalized)) return null;

  const [whole, fraction = ""] = normalized.split(".");
  return BigInt(whole) * 100n + BigInt((fraction + "00").slice(0, 2));
}

function parseBkmResponse(payload: unknown): BookIndexCollectionResult {
  if (!payload || typeof payload !== "object") {
    throw new Error("BOOK_INDEX_BKM_INVALID_RESPONSE");
  }

  const response = payload as BkmResponse;
  if (!Array.isArray(response.res)) {
    throw new Error("BOOK_INDEX_BKM_RESULTS_NOT_FOUND");
  }

  const sourceItems = response.res.slice(0, MAX_BOOKS);
  if (sourceItems.length < MIN_EXPECTED_BOOKS) {
    throw new Error("BOOK_INDEX_BKM_RESULT_TOO_SMALL");
  }

  const books = sourceItems.map((raw, index) => {
    if (!raw || typeof raw !== "object") {
      throw new Error("BOOK_INDEX_BKM_INVALID_ITEM");
    }

    const item = raw as BkmItem;
    const title = stringValue(item.title);
    const productUrl = stringValue(item.link);
    const productId = stringValue(item.product_id);
    const productCode = stringValue(item.product_code);
    const gtin = isbn13(item.gtin);

    if (!title || !/^https:\/\/bkmkitap\.com\//u.test(productUrl)) {
      throw new Error("BOOK_INDEX_BKM_INVALID_ITEM");
    }

    const ix = typeof item.ix === "number" ? item.ix : Number(item.ix);
    if (Number.isFinite(ix) && ix !== index) {
      throw new Error("BOOK_INDEX_BKM_RANK_ORDER_MISMATCH");
    }

    return {
      sourceKey: gtin || productCode || productId || productUrl,
      sourceExternalId: productId || null,
      title,
      authorName: stringValue(item.writer) || null,
      publisherName: stringValue(item.brand) || null,
      isbn13: gtin,
      productUrl,
      imageUrl: stringValue(item.image) || null,
      rank: index + 1,
      priceAmount: priceToMinorUnits(item.sale_price),
      currency: "TRY",
    };
  });

  const uniqueSourceKeys = new Set(books.map((book) => book.sourceKey));
  if (uniqueSourceKeys.size !== books.length) {
    throw new Error("BOOK_INDEX_BKM_DUPLICATE_SOURCE_KEY");
  }

  return { books };
}

export const bkmBookIndexAdapter: BookIndexSourceAdapter = {
  sourceCode: SOURCE_CODE,
  async collect(
    context: BookIndexCollectionContext,
  ): Promise<BookIndexCollectionResult> {
    const span = spanForList(context.listCode);
    const url = new URL(ENDPOINT);
    url.searchParams.set("span", span);

    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "IlkOkuBookIndex/0.1 (+https://ilkoku.com)",
      },
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      throw new Error(`BOOK_INDEX_SOURCE_HTTP_${response.status}`);
    }

    return parseBkmResponse(await response.json());
  },
};

export { parseBkmResponse };
