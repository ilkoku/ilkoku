import type {
  BookIndexCollectionContext,
  BookIndexCollectionResult,
  BookIndexSourceAdapter,
} from "../adapter";

const SOURCE_CODE = "pandora";
const SOURCE_ORIGIN = "https://www.pandora.com.tr";
const API_URL = "https://www.pandora.com.tr/api/coksatanlar";
const NEW_RELEASE_API_URL = "https://www.pandora.com.tr/api/yenikitaplar?dil=1";
const EXPECTED_NATIVE_ROWS = 50;
const MIN_UNIQUE_BOOKS = 40;
const NEW_RELEASE_NATIVE_PAGE_SIZE = 40;
const NEW_RELEASE_MIN_API_ROWS = 40;

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


type PandoraNewReleasePayload = {
  books?: unknown;
  categoryId?: unknown;
  categoryName?: unknown;
  language?: unknown;
};

function pandoraDateTimestamp(value: unknown) {
  const raw = textValue(value);
  if (!raw) return null;

  const parsed = new Date(raw);
  const timestamp = parsed.getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function pandoraWeekKey(value: unknown) {
  const raw = textValue(value);
  if (!raw) return null;

  const parsed = new Date(raw);
  if (!Number.isFinite(parsed.getTime())) return null;

  const day = parsed.getDay();
  parsed.setDate(parsed.getDate() - day + (day === 0 ? -6 : 1));
  parsed.setHours(0, 0, 0, 0);
  return parsed.toISOString().slice(0, 10);
}

function publisherRoundRobinByWeek(rows: PandoraApiRow[]) {
  const weeks = new Map<string, PandoraApiRow[]>();
  const invalidDateRows: PandoraApiRow[] = [];

  for (const row of rows) {
    const weekKey = pandoraWeekKey(row.yayintarih);
    if (!weekKey) {
      invalidDateRows.push(row);
      continue;
    }

    const bucket = weeks.get(weekKey) ?? [];
    bucket.push(row);
    weeks.set(weekKey, bucket);
  }

  const ordered: PandoraApiRow[] = [];

  for (const weekRows of weeks.values()) {
    if (weekRows.length <= 1) {
      ordered.push(...weekRows);
      continue;
    }

    const publishers = new Map<string, PandoraApiRow[]>();
    for (const row of weekRows) {
      const publisher = textValue(row.yayinci) || "Bilinmeyen";
      const bucket = publishers.get(publisher) ?? [];
      bucket.push(row);
      publishers.set(publisher, bucket);
    }

    const maxPublisherRows = Math.max(
      ...[...publishers.values()].map((bucket) => bucket.length),
    );

    for (let index = 0; index < maxPublisherRows; index += 1) {
      for (const bucket of publishers.values()) {
        const row = bucket[index];
        if (row) ordered.push(row);
      }
    }
  }

  ordered.push(...invalidDateRows);
  return ordered;
}

function pandoraNewReleaseSmartOrder(rows: PandoraApiRow[]) {
  const groups = [
    rows.filter((row) => integerValue(row.aktif) === 5),
    rows.filter((row) => integerValue(row.aktif) === 4),
    rows.filter((row) => {
      const status = integerValue(row.aktif);
      return status !== 4 && status !== 5;
    }),
  ];

  return groups.flatMap((group) =>
    publisherRoundRobinByWeek(
      [...group].sort(
        (left, right) =>
          (pandoraDateTimestamp(right.yayintarih) ?? Number.NEGATIVE_INFINITY)
          - (pandoraDateTimestamp(left.yayintarih) ?? Number.NEGATIVE_INFINITY),
      ),
    ),
  );
}

export function parsePandoraNewReleases(
  payload: unknown,
): BookIndexCollectionResult {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("BOOK_INDEX_PANDORA_NEW_RELEASE_INVALID_RESPONSE");
  }

  const response = payload as PandoraNewReleasePayload;
  if (
    textValue(response.categoryId) !== "yenikitaplar"
    || textValue(response.categoryName) !== "Yeni Kitaplar"
    || textValue(response.language) !== "1"
    || !Array.isArray(response.books)
  ) {
    throw new Error("BOOK_INDEX_PANDORA_NEW_RELEASE_NATIVE_FEED_MISMATCH");
  }

  if (response.books.length < NEW_RELEASE_MIN_API_ROWS) {
    throw new Error("BOOK_INDEX_PANDORA_NEW_RELEASE_RESULT_TOO_SMALL");
  }

  const rows = response.books.map((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new Error("BOOK_INDEX_PANDORA_NEW_RELEASE_INVALID_ITEM");
    }
    return raw as PandoraApiRow;
  });

  const nativeFirstPage = pandoraNewReleaseSmartOrder(rows)
    .slice(0, NEW_RELEASE_NATIVE_PAGE_SIZE);

  if (nativeFirstPage.length !== NEW_RELEASE_NATIVE_PAGE_SIZE) {
    throw new Error("BOOK_INDEX_PANDORA_NEW_RELEASE_PAGE_SIZE_MISMATCH");
  }

  const books = nativeFirstPage.map((row, index) => {
    const productId = textValue(row.id);
    const title = textValue(row.adi);
    const authorName = textValue(row.yazar) || null;
    const publisherName = textValue(row.yayinci);
    const ean = isbn13(row.ean);

    if (
      !productId
      || !title
      || !publisherName
      || integerValue(row.dil) !== 1
      || textValue(row.dili) !== "Türkçe"
      || textValue(row.yeniUrun) !== "yeniUrun"
      || pandoraDateTimestamp(row.yayintarih) === null
    ) {
      throw new Error("BOOK_INDEX_PANDORA_NEW_RELEASE_INVALID_ITEM");
    }

    return {
      sourceKey: ean || productId,
      sourceExternalId: productId,
      title,
      authorName,
      publisherName,
      isbn13: ean,
      productUrl: productUrl(title, productId),
      imageUrl: imageUrl(row.gorselUrl),
      rank: index + 1,
      priceAmount: priceToMinorUnits(row.fiyat),
      currency: "TRY",
    };
  });

  const sourceKeys = new Set(books.map((book) => book.sourceKey));
  const productIds = new Set(books.map((book) => book.sourceExternalId));

  if (sourceKeys.size !== books.length || productIds.size !== books.length) {
    throw new Error("BOOK_INDEX_PANDORA_NEW_RELEASE_DUPLICATE_IDENTITY");
  }

  return { books };
}

export const pandoraBookIndexAdapter: BookIndexSourceAdapter = {
  sourceCode: SOURCE_CODE,
  async collect(
    context: BookIndexCollectionContext,
  ): Promise<BookIndexCollectionResult> {
    const isNewReleaseList = context.listCode === "pandora-tr-new-releases";
    const response = await fetch(isNewReleaseList ? NEW_RELEASE_API_URL : API_URL, {
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

    return isNewReleaseList
      ? parsePandoraNewReleases(payload)
      : parsePandoraBestsellers(payload);
  },
};
