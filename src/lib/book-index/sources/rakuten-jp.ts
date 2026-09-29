import type {
  BookIndexCollectionContext,
  BookIndexCollectionResult,
  BookIndexSourceAdapter,
} from "../adapter";

const SOURCE_CODE = "rakuten-jp";
const EXPECTED_BOOKS = 30;

type RakutenAuthor = string | null;

type RakutenBook = {
  id?: string | number | null;
  rank?: number | string | null;
  prerank?: number | string | null;
  title?: string | null;
  author?: RakutenAuthor[] | RakutenAuthor | null;
  publisher?: string | null;
  isbn_jan?: string | null;
  image_url?: string | null;
  url?: string | null;
};

type RakutenResponse = {
  count?: number;
  data?: RakutenBook[];
  genre_id?: string;
  genre_name?: string;
  hits?: number;
  kind?: string;
  page?: number;
  page_count?: number;
  period?: string | number;
};

function normalizeText(value: unknown) {
  return typeof value === "string"
    ? value.replace(/\s+/gu, " ").trim()
    : "";
}

function normalizeAuthor(value: RakutenBook["author"]) {
  if (Array.isArray(value)) {
    const authors = value.map(normalizeText).filter(Boolean);
    return authors.length ? authors.join("; ") : null;
  }

  const author = normalizeText(value);
  return author || null;
}

function normalizeIsbn(value: unknown) {
  const text = normalizeText(value);
  return /^(?:978|979)[0-9]{10}$/u.test(text) ? text : null;
}

export function parseRakutenJapanWeeklyRanking(
  payload: RakutenResponse,
): BookIndexCollectionResult {
  if (
    payload.genre_id !== "001"
    || !Array.isArray(payload.data)
    || payload.data.length !== EXPECTED_BOOKS
  ) {
    throw new Error("BOOK_INDEX_RAKUTEN_JP_RESPONSE_MISMATCH");
  }

  const books = payload.data.map((item, index) => {
    const rank = Number(item.rank);
    const title = normalizeText(item.title);
    const productUrl = normalizeText(item.url);
    const isbn13 = normalizeIsbn(item.isbn_jan);
    const id = normalizeText(item.id);
    const sourceKey = isbn13 || id || productUrl;

    if (
      !Number.isInteger(rank)
      || rank !== index + 1
      || !title
      || !productUrl
      || !sourceKey
    ) {
      throw new Error("BOOK_INDEX_RAKUTEN_JP_INVALID_ITEM");
    }

    return {
      sourceKey,
      sourceExternalId: id || sourceKey,
      title,
      authorName: normalizeAuthor(item.author),
      publisherName: normalizeText(item.publisher) || null,
      isbn13,
      productUrl,
      imageUrl: normalizeText(item.image_url) || null,
      rank,
      currency: "JPY",
    };
  });

  const keys = new Set(books.map((book) => book.sourceKey));
  if (keys.size !== books.length) {
    throw new Error("BOOK_INDEX_RAKUTEN_JP_DUPLICATE_SOURCE_KEY");
  }

  return { books };
}

async function fetchJson(url: string): Promise<RakutenResponse> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Accept-Language": "ja-JP,ja;q=0.9,en;q=0.6",
      "User-Agent": "IlkOkuBookIndex/0.1 (+https://ilkoku.com)",
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`BOOK_INDEX_SOURCE_HTTP_${response.status}`);
  }

  return response.json() as Promise<RakutenResponse>;
}

export const rakutenJapanBookIndexAdapter: BookIndexSourceAdapter = {
  sourceCode: SOURCE_CODE,
  async collect(
    context: BookIndexCollectionContext,
  ): Promise<BookIndexCollectionResult> {
    if (context.listCode !== "rakuten-jp-weekly") {
      throw new Error("BOOK_INDEX_RAKUTEN_JP_LIST_NOT_SUPPORTED");
    }

    return parseRakutenJapanWeeklyRanking(
      await fetchJson(context.sourceUrl),
    );
  },
};
