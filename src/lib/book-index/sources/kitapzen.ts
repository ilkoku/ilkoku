import type {
  BookIndexCollectionContext,
  BookIndexCollectionResult,
  BookIndexSourceAdapter,
} from "../adapter";
import { decodeBookIndexHtml } from "../html";

const SOURCE_CODE = "kitapzen";
const SOURCE_ORIGIN = "https://www.kitapzen.com";
const MAX_BOOKS = 20;
const MIN_EXPECTED_BOOKS = 15;

function absoluteUrl(value: string) {
  return new URL(value, SOURCE_ORIGIN).toString();
}

function isbn13(value: string) {
  const normalized = value.replace(/[^0-9]/gu, "");
  return /^[0-9]{13}$/u.test(normalized) ? normalized : null;
}

function priceToMinorUnits(value: string) {
  const normalized = value.trim();
  if (!/^[0-9]+(?:\.[0-9]{1,2})?$/u.test(normalized)) return null;

  const [whole, fraction = ""] = normalized.split(".");
  return BigInt(whole) * BigInt(100) + BigInt((fraction + "00").slice(0, 2));
}

export function parseKitapzenBestsellers(
  html: string,
  rankOffset = 0,
): BookIndexCollectionResult {
  const starts = [
    ...html.matchAll(
      /<div\b(?=[^>]*\bclass=["'][^"']*\bProduct_b\b[^"']*["'])(?=[^>]*\bdata-prd-id=["']([^"']+)["'])(?=[^>]*\bdata-prd-barcode=["']([^"']*)["'])[^>]*>/giu,
    ),
  ];

  const books = starts
    .map((match, index) => {
      const start = match.index ?? 0;
      const end = starts[index + 1]?.index ?? html.length;
      const card = html.slice(start, end);

      const productId = match[1]?.trim() ?? "";
      const barcode = match[2]?.trim() ?? "";

      const titleMatch = card.match(
        /<div\b[^>]*\bclass=["'][^"']*\bname\b[^"']*["'][^>]*>\s*<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/iu,
      );
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

      if (!titleMatch || !productId) {
        throw new Error("BOOK_INDEX_KITAPZEN_INVALID_ITEM");
      }

      const productUrl = titleMatch[1];
      const title = decodeBookIndexHtml(titleMatch[2]);
      if (!productUrl || !title) {
        throw new Error("BOOK_INDEX_KITAPZEN_INVALID_ITEM");
      }

      return {
        sourceKey: isbn13(barcode) || productId,
        sourceExternalId: productId,
        title,
        authorName: author ? decodeBookIndexHtml(author) : null,
        publisherName: publisher ? decodeBookIndexHtml(publisher) : null,
        isbn13: isbn13(barcode),
        productUrl: absoluteUrl(productUrl),
        imageUrl: image ? absoluteUrl(image) : null,
        rank: rankOffset + index + 1,
        priceAmount: salePrice ? priceToMinorUnits(salePrice) : null,
        currency: "TRY",
      };
    })
    .slice(0, MAX_BOOKS);

  if (books.length < MIN_EXPECTED_BOOKS) {
    throw new Error("BOOK_INDEX_KITAPZEN_RESULT_TOO_SMALL");
  }

  const uniqueKeys = new Set(books.map((book) => book.sourceKey));
  if (uniqueKeys.size !== books.length) {
    throw new Error("BOOK_INDEX_KITAPZEN_DUPLICATE_SOURCE_KEY");
  }

  return { books };
}

async function fetchKitapzenPage(url: string) {
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

export const kitapzenBookIndexAdapter: BookIndexSourceAdapter = {
  sourceCode: SOURCE_CODE,
  async collect(
    context: BookIndexCollectionContext,
  ): Promise<BookIndexCollectionResult> {
    if (context.listCode !== "kitapzen-tr-weekly") {
      return parseKitapzenBestsellers(
        await fetchKitapzenPage(context.sourceUrl),
      );
    }

    const books = [];
    for (let page = 1; page <= 3; page += 1) {
      const url = new URL(context.sourceUrl);
      url.searchParams.set("page", String(page));
      const parsed = parseKitapzenBestsellers(
        await fetchKitapzenPage(url.toString()),
        (page - 1) * MAX_BOOKS,
      );
      books.push(...parsed.books);
    }

    const uniqueKeys = new Set(books.map((book) => book.sourceKey));
    if (uniqueKeys.size !== books.length) {
      throw new Error("BOOK_INDEX_KITAPZEN_DUPLICATE_SOURCE_KEY");
    }

    return { books };
  },
};
