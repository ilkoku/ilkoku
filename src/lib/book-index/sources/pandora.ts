import type {
  BookIndexCollectionContext,
  BookIndexCollectionResult,
  BookIndexSourceAdapter,
} from "../adapter";

const SOURCE_CODE = "pandora";
const SOURCE_ORIGIN = "https://www.pandora.com.tr";
const API_URL = "https://www.pandora.com.tr/api/coksatanlar";
const EXPECTED_NATIVE_ROWS = 50;
const MIN_UNIQUE_BOOKS = 40;

type PandoraApiRow = Record<string, unknown>;

function textValue(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function integerValue(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && /^\d+$/u.test(value.trim())) {
    return Number(value.trim());
  }
  return Number.NaN;
}

function isbn13(value: unknown) {
  const normalized = textValue(value).replace(/[^0-9]/gu, "");
  return /^(?:978|979)[0-9]{10}$/u.test(normalized) ? normalized : null;
}

function priceToMinorUnits(value: unknown) {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) return null;
    return BigInt(Math.round(value * 100));
  }

  let normalized = textValue(value)
    .replace(/\u00a0/gu, " ")
    .replace(/\s*TL\s*$/iu, "")
    .replace(/[^0-9,.-]/gu, "")
    .trim();

  if (!normalized) return null;

  if (normalized.includes(",") && normalized.includes(".")) {
    normalized = normalized.replace(/\./gu, "").replace(/,/gu, ".");
  } else if (normalized.includes(",")) {
    normalized = normalized.replace(/,/gu, ".");
  }

  if (!/^\d+(?:\.\d{1,2})?$/u.test(normalized)) return null;

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return BigInt(Math.round(amount * 100));
}

function productSlug(title: string) {
  return title
    .toLocaleLowerCase("tr-TR")
    .replace(/[ç]/gu, "c")
    .replace(/[ğ]/gu, "g")
    .replace(/[ı]/gu, "i")
    .replace(/[ö]/gu, "o")
    .replace(/[ş]/gu, "s")
    .replace(/[ü]/gu, "u")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
}

function productUrl(title: string, productId: string) {
  const slug = productSlug(title) || "kitap";
  return new URL(
    `/kitap/${slug}/${encodeURIComponent(productId)}`,
    SOURCE_ORIGIN,
  ).toString();
}

function imageUrl(value: unknown) {
  const raw = textValue(value);
  if (!raw) return null;

  try {
    const url = new URL(raw, SOURCE_ORIGIN);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function sameIdentity(
  left: {
    title: string;
    authorName: string;
    publisherName: string;
    isbn13: string;
  },
  right: {
    title: string;
    authorName: string;
    publisherName: string;
    isbn13: string;
  },
) {
  return (
    left.title === right.title
    && left.authorName === right.authorName
    && left.publisherName === right.publisherName
    && left.isbn13 === right.isbn13
  );
}

export function parsePandoraBestsellers(
  payload: unknown,
): BookIndexCollectionResult {
  if (!Array.isArray(payload)) {
    throw new Error("BOOK_INDEX_PANDORA_INVALID_RESPONSE");
  }

  if (payload.length !== EXPECTED_NATIVE_ROWS) {
    throw new Error("BOOK_INDEX_PANDORA_RESULT_SIZE_CHANGED");
  }

  const parsed = payload.map((raw, index) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new Error("BOOK_INDEX_PANDORA_INVALID_ITEM");
    }

    const row = raw as PandoraApiRow;
    const rank = integerValue(row.cokid);
    const productId = textValue(row.id);
    const title = textValue(row.adi);
    const authorName = textValue(row.yazar);
    const publisherName = textValue(row.yayinci);
    const ean = isbn13(row.ean);
    const priceAmount = priceToMinorUnits(row.fiyat);

    if (
      rank !== index + 1
      || rank < 1
      || rank > EXPECTED_NATIVE_ROWS
      || !productId
      || !title
      || !authorName
      || !publisherName
      || !ean
      || priceAmount === null
    ) {
      throw new Error("BOOK_INDEX_PANDORA_INVALID_ITEM");
    }

    return {
      sourceKey: ean,
      sourceExternalId: productId,
      title,
      authorName,
      publisherName,
      isbn13: ean,
      productUrl: productUrl(title, productId),
      imageUrl: imageUrl(row.gorselUrl),
      rank,
      priceAmount,
      currency: "TRY",
    };
  });

  const byProductId = new Map<string, (typeof parsed)[number]>();
  const byIsbn = new Map<string, (typeof parsed)[number]>();
  const books: typeof parsed = [];

  for (const book of parsed) {
    const productId = book.sourceExternalId;
    if (!productId) {
      throw new Error("BOOK_INDEX_PANDORA_INVALID_ITEM");
    }

    const existingProduct = byProductId.get(productId);
    if (existingProduct && !sameIdentity(existingProduct, book)) {
      throw new Error("BOOK_INDEX_PANDORA_PRODUCT_ID_COLLISION");
    }
    if (!existingProduct) byProductId.set(productId, book);

    const existingIsbn = byIsbn.get(book.isbn13);
    if (existingIsbn) {
      if (!sameIdentity(existingIsbn, book)) {
        throw new Error("BOOK_INDEX_PANDORA_ISBN_COLLISION");
      }

      // Pandora can repeat the exact same product at multiple native ranks.
      // Keep the first/best native rank; never renumber or create a second vote.
      continue;
    }

    byIsbn.set(book.isbn13, book);
    books.push(book);
  }

  if (books.length < MIN_UNIQUE_BOOKS) {
    throw new Error("BOOK_INDEX_PANDORA_RESULT_TOO_SMALL");
  }

  return { books };
}

export const pandoraBookIndexAdapter: BookIndexSourceAdapter = {
  sourceCode: SOURCE_CODE,
  async collect(
    _context: BookIndexCollectionContext,
  ): Promise<BookIndexCollectionResult> {
    const response = await fetch(API_URL, {
      cache: "no-store",
      headers: {
        Accept: "application/json,text/plain,*/*",
        "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.5",
        "User-Agent": "IlkOkuBookIndex/0.1 (+https://ilkoku.com)",
      },
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      throw new Error(`BOOK_INDEX_SOURCE_HTTP_${response.status}`);
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new Error("BOOK_INDEX_PANDORA_INVALID_RESPONSE");
    }

    return parsePandoraBestsellers(payload);
  },
};
