import type {
  BookIndexCollectionContext,
  BookIndexCollectionResult,
  BookIndexSourceAdapter,
} from "../adapter";
import { decodeBookIndexHtml } from "../html";

const SOURCE_CODE = "kitapambari";
const SOURCE_ORIGIN = "https://www.kitapambari.com";
const PAGE_SIZE = 20;
const PAGE_COUNT = 5;

function absoluteUrl(value: string) {
  return new URL(value, SOURCE_ORIGIN).toString();
}

function isbn13(value: string) {
  const normalized = value.replace(/[^0-9]/gu, "");
  return /^(?:978|979)[0-9]{10}$/u.test(normalized) ? normalized : null;
}

function priceToMinorUnits(value: string) {
  const normalized = value.trim();
  if (!/^[0-9]+(?:\.[0-9]{1,2})?$/u.test(normalized)) return null;

  const [whole, fraction = ""] = normalized.split(".");
  return BigInt(whole) * BigInt(100) + BigInt((fraction + "00").slice(0, 2));
}

function attribute(tag: string, name: string) {
  const match = tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, "iu"));
  return match?.[1]?.trim() ?? "";
}

export function parseKitapAmbariBestsellers(
  html: string,
  rankOffset = 0,
): BookIndexCollectionResult {
  const starts = [
    ...html.matchAll(
      /<div\b(?=[^>]*\bclass=["'][^"']*\bProduct_b\b[^"']*["'])(?=[^>]*\bdata-prd-id=["']([^"']+)["'])(?=[^>]*\bdata-prd-barcode=["']([^"']*)["'])[^>]*>/giu,
    ),
  ];

  if (starts.length !== PAGE_SIZE) {
    throw new Error("BOOK_INDEX_KITAPAMBARI_PAGE_SIZE_CHANGED");
  }

  const books = starts.map((match, index) => {
    const start = match.index ?? 0;
    const end = starts[index + 1]?.index ?? html.length;
    const card = html.slice(start, end);

    const productId = match[1]?.trim() ?? "";
    const barcode = match[2]?.trim() ?? "";
    const productAnchor = card.match(
      /<a\b(?=[^>]*\bclass=["'][^"']*\btooltip-ajax\b[^"']*["'])[^>]*>/iu,
    )?.[0] ?? "";
    const productUrl = attribute(productAnchor, "href");
    const titleAttribute = attribute(productAnchor, "title");

    const nameAnchor = card.match(
      /<div\b[^>]*\bclass=["'][^"']*\bname\b[^"']*["'][^>]*>\s*<a\b[^>]*>([\s\S]*?)<\/a>/iu,
    )?.[1];
    const author = card.match(
      /<div\b[^>]*\bclass=["'][^"']*\bwriter\b[^"']*["'][^>]*>\s*<a\b[^>]*>([\s\S]*?)<\/a>/iu,
    )?.[1];
    const publisher = card.match(
      /<div\b[^>]*\bclass=["'][^"']*\bpublisher\b[^"']*["'][^>]*>\s*<a\b[^>]*>([\s\S]*?)<\/a>/iu,
    )?.[1];
    const image = card.match(
      /<img\b[^>]*\bclass=["'][^"']*\bprd_img\b[^"']*["'][^>]*\bdata-src=["']([^"']+)["'][^>]*>/iu,
    )?.[1];
    const salePrice = card.match(
      /<span\b[^>]*\bclass=["'][^"']*\bprice_sale\b[^"']*["'][^>]*\bdata-price=["']([^"']+)["'][^>]*>/iu,
    )?.[1];

    if (!productId || !productUrl || (!titleAttribute && !nameAnchor)) {
      throw new Error("BOOK_INDEX_KITAPAMBARI_INVALID_ITEM");
    }

    const title = decodeBookIndexHtml(titleAttribute || nameAnchor || "");
    if (!title) {
      throw new Error("BOOK_INDEX_KITAPAMBARI_INVALID_ITEM");
    }

    const validIsbn13 = isbn13(barcode);

    return {
      sourceKey: validIsbn13 || productId,
      sourceExternalId: productId,
      title,
      authorName: author ? decodeBookIndexHtml(author) : null,
      publisherName: publisher ? decodeBookIndexHtml(publisher) : null,
      isbn13: validIsbn13,
      productUrl: absoluteUrl(productUrl),
      imageUrl: image ? absoluteUrl(image) : null,
      rank: rankOffset + index + 1,
      priceAmount: salePrice ? priceToMinorUnits(salePrice) : null,
      currency: "TRY",
    };
  });

  const uniqueProductIds = new Set(books.map((book) => book.sourceExternalId));
  if (uniqueProductIds.size !== books.length) {
    throw new Error("BOOK_INDEX_KITAPAMBARI_DUPLICATE_PRODUCT_ID");
  }

  const uniqueKeys = new Set(books.map((book) => book.sourceKey));
  if (uniqueKeys.size !== books.length) {
    throw new Error("BOOK_INDEX_KITAPAMBARI_DUPLICATE_SOURCE_KEY");
  }

  return { books };
}

async function fetchKitapAmbariPage(url: string) {
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

export const kitapAmbariBookIndexAdapter: BookIndexSourceAdapter = {
  sourceCode: SOURCE_CODE,
  async collect(
    context: BookIndexCollectionContext,
  ): Promise<BookIndexCollectionResult> {
    const books: BookIndexCollectionResult["books"] = [];

    for (let page = 1; page <= PAGE_COUNT; page += 1) {
      const url = new URL(context.sourceUrl);
      url.searchParams.set("mod_id", "41");
      url.searchParams.set("page", String(page));

      const parsed = parseKitapAmbariBestsellers(
        await fetchKitapAmbariPage(url.toString()),
        (page - 1) * PAGE_SIZE,
      );
      books.push(...parsed.books);
    }

    if (books.length !== PAGE_SIZE * PAGE_COUNT) {
      throw new Error("BOOK_INDEX_KITAPAMBARI_RESULT_SIZE_CHANGED");
    }

    const uniqueProductIds = new Set(
      books.map((book) => book.sourceExternalId),
    );
    if (uniqueProductIds.size !== books.length) {
      throw new Error("BOOK_INDEX_KITAPAMBARI_DUPLICATE_PRODUCT_ID");
    }

    const uniqueKeys = new Set(books.map((book) => book.sourceKey));
    if (uniqueKeys.size !== books.length) {
      throw new Error("BOOK_INDEX_KITAPAMBARI_DUPLICATE_SOURCE_KEY");
    }

    return { books };
  },
};
