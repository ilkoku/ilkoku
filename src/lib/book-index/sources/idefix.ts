import type {
  BookIndexCollectionContext,
  BookIndexCollectionResult,
  BookIndexSourceAdapter,
} from "../adapter";

const SOURCE_CODE = "idefix";
const SOURCE_ORIGIN = "https://www.idefix.com";
const MIN_EXPECTED_ORGANIC_BOOKS = 15;

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
    const response = await fetch(context.sourceUrl, {
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

    return parseIdefixBestsellers(await response.text());
  },
};
