import type {
  BookIndexCollectionContext,
  BookIndexCollectionResult,
  BookIndexSourceAdapter,
} from "../adapter";

const SOURCE_CODE = "pandora";
const SOURCE_ORIGIN = "https://www.pandora.com.tr";
const API_URL = "https://www.pandora.com.tr/api/coksatanlar";
const NEW_RELEASE_SOURCE_URL = "https://www.pandora.com.tr/Yeni_Kitaplar/Turkce";
const NEW_RELEASE_API_URL = "https://www.pandora.com.tr/api/yenikitaplar?dil=1";
const EXPECTED_NATIVE_ROWS = 50;
const MIN_UNIQUE_BOOKS = 40;
const NEW_RELEASE_MIN_EXPECTED_BOOKS = 40;
const NEW_RELEASE_LANGUAGE_ID = 1;

type PandoraApiRow = Record<string, unknown>;
type PandoraNewReleasePayload = {
  books?: unknown;
  categoryId?: unknown;
  categoryName?: unknown;
  language?: unknown;
};

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

function newReleaseDate(row: PandoraApiRow) {
  const raw = textValue(row.yayintarih);
  if (!raw) return null;

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function newReleaseWeekKey(row: PandoraApiRow) {
  const date = newReleaseDate(row);
  if (!date) return null;

  const monday = new Date(date);
  const day = monday.getDay();
  monday.setDate(monday.getDate() - day + (day === 0 ? -6 : 1));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split("T")[0] ?? null;
}

function balancePandoraNewReleasePublishers(rows: PandoraApiRow[]) {
  const invalidDateRows = rows.filter((row) => newReleaseDate(row) === null);
  const weeks = new Map<string, PandoraApiRow[]>();

  for (const row of rows) {
    const weekKey = newReleaseWeekKey(row);
    if (!weekKey) continue;

    const weekRows = weeks.get(weekKey) ?? [];
    weekRows.push(row);
    weeks.set(weekKey, weekRows);
  }

  const balanced: PandoraApiRow[] = [];

  for (const weekRows of weeks.values()) {
    if (weekRows.length <= 1) {
      balanced.push(...weekRows);
      continue;
    }

    const publishers = new Map<string, PandoraApiRow[]>();
    for (const row of weekRows) {
      const publisher = textValue(row.yayinci) || "Bilinmeyen";
      const publisherRows = publishers.get(publisher) ?? [];
      publisherRows.push(row);
      publishers.set(publisher, publisherRows);
    }

    const maxRows = Math.max(
      ...Array.from(publishers.values(), (publisherRows) => publisherRows.length),
    );

    for (let index = 0; index < maxRows; index += 1) {
      for (const publisherRows of publishers.values()) {
        const row = publisherRows[index];
        if (row) balanced.push(row);
      }
    }
  }

  balanced.push(...invalidDateRows);
  return balanced;
}

export function sortPandoraNewReleasesNative(rows: readonly PandoraApiRow[]) {
  const byNewest = (items: PandoraApiRow[]) =>
    items.sort((left, right) => {
      const leftDate = newReleaseDate(left)?.getTime() ?? Number.NEGATIVE_INFINITY;
      const rightDate = newReleaseDate(right)?.getTime() ?? Number.NEGATIVE_INFINITY;
      return rightDate - leftDate;
    });

  const activeFive = byNewest(
    rows.filter((row) => integerValue(row.aktif) === 5).map((row) => ({ ...row })),
  );
  const activeFour = byNewest(
    rows.filter((row) => integerValue(row.aktif) === 4).map((row) => ({ ...row })),
  );
  const remaining = byNewest(
    rows
      .filter((row) => {
        const active = integerValue(row.aktif);
        return active !== 5 && active !== 4;
      })
      .map((row) => ({ ...row })),
  );

  return [
    ...balancePandoraNewReleasePublishers(activeFive),
    ...balancePandoraNewReleasePublishers(activeFour),
    ...balancePandoraNewReleasePublishers(remaining),
  ];
}

export function parsePandoraNewReleases(
  payload: unknown,
  maxBooks: number,
): BookIndexCollectionResult {
  if (!Number.isSafeInteger(maxBooks) || maxBooks < 1) {
    throw new Error("BOOK_INDEX_PANDORA_NEW_RELEASE_LIMIT_INVALID");
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("BOOK_INDEX_PANDORA_NEW_RELEASE_INVALID_RESPONSE");
  }

  const response = payload as PandoraNewReleasePayload;
  if (
    textValue(response.categoryId) !== "yenikitaplar"
    || integerValue(response.language) !== NEW_RELEASE_LANGUAGE_ID
  ) {
    throw new Error("BOOK_INDEX_PANDORA_NEW_RELEASE_NATIVE_LIST_MISMATCH");
  }

  if (!Array.isArray(response.books)) {
    throw new Error("BOOK_INDEX_PANDORA_NEW_RELEASE_RESULTS_NOT_FOUND");
  }

  if (
    response.books.length < NEW_RELEASE_MIN_EXPECTED_BOOKS
    || response.books.length < maxBooks
  ) {
    throw new Error("BOOK_INDEX_PANDORA_NEW_RELEASE_RESULT_TOO_SMALL");
  }

  const rows = response.books.map((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new Error("BOOK_INDEX_PANDORA_NEW_RELEASE_INVALID_ITEM");
    }
    return raw as PandoraApiRow;
  });

  const selected = sortPandoraNewReleasesNative(rows).slice(0, maxBooks);
  const books = selected.map((row, index) => {
    const productId = textValue(row.id);
    const title = textValue(row.adi);
    const authorName = textValue(row.yazar) || null;
    const publisherName = textValue(row.yayinci) || null;
    const ean = isbn13(row.ean);
    const languageId = integerValue(row.dil);
    const priceAmount = priceToMinorUnits(row.fiyat);

    if (
      !productId
      || !title
      || languageId !== NEW_RELEASE_LANGUAGE_ID
      || priceAmount === null
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
      priceAmount,
      currency: "TRY",
    };
  });

  const sourceKeys = new Set<string>();
  const productIds = new Set<string>();

  for (const book of books) {
    if (sourceKeys.has(book.sourceKey)) {
      throw new Error("BOOK_INDEX_PANDORA_NEW_RELEASE_DUPLICATE_SOURCE_KEY");
    }
    if (!book.sourceExternalId || productIds.has(book.sourceExternalId)) {
      throw new Error("BOOK_INDEX_PANDORA_NEW_RELEASE_DUPLICATE_PRODUCT_ID");
    }

    sourceKeys.add(book.sourceKey);
    productIds.add(book.sourceExternalId);
  }

  return { books };
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
    context: BookIndexCollectionContext,
  ): Promise<BookIndexCollectionResult> {
    const isNewReleaseList = context.listCode === "pandora-tr-new-releases";
    const endpoint = isNewReleaseList ? NEW_RELEASE_API_URL : API_URL;

    let newReleaseLimit: number | null = null;
    if (isNewReleaseList) {
      if (context.sourceUrl !== NEW_RELEASE_SOURCE_URL) {
        throw new Error("BOOK_INDEX_PANDORA_NEW_RELEASE_SOURCE_URL_MISMATCH");
      }

      const configuredLimit = context.maxRank;
      if (
        typeof configuredLimit !== "number"
        || !Number.isSafeInteger(configuredLimit)
        || configuredLimit < 1
      ) {
        throw new Error("BOOK_INDEX_PANDORA_NEW_RELEASE_LIMIT_NOT_CONFIGURED");
      }
      newReleaseLimit = configuredLimit;
    }

    const response = await fetch(endpoint, {
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
      throw new Error(
        isNewReleaseList
          ? "BOOK_INDEX_PANDORA_NEW_RELEASE_INVALID_RESPONSE"
          : "BOOK_INDEX_PANDORA_INVALID_RESPONSE",
      );
    }

    if (isNewReleaseList) {
      if (newReleaseLimit === null) {
        throw new Error("BOOK_INDEX_PANDORA_NEW_RELEASE_LIMIT_NOT_CONFIGURED");
      }
      return parsePandoraNewReleases(payload, newReleaseLimit);
    }

    return parsePandoraBestsellers(payload);
  },
};
