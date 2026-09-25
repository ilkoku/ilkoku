import type {
  BookIndexCollectionContext,
  BookIndexCollectionResult,
  BookIndexSourceAdapter,
} from "../adapter";
import { decodeBookIndexHtml } from "../html";

const SOURCE_CODE = "inkilap";
const SOURCE_ORIGIN = "https://www.inkilap.com";
const MAX_BOOKS = 20;
const MIN_EXPECTED_BOOKS = 15;

function absoluteUrl(value: string) {
  return new URL(value, SOURCE_ORIGIN).toString();
}

function isbn13(value: string) {
  const normalized = value.replace(/[^0-9]/gu, "");
  return /^(?:978|979)[0-9]{10}$/u.test(normalized) ? normalized : null;
}

function priceToMinorUnits(value: string) {
  const normalized = value
    .replace(/\s*TL\s*/giu, "")
    .replace(/\./gu, "")
    .replace(",", ".")
    .trim();

  if (!/^[0-9]+(?:\.[0-9]{1,2})?$/u.test(normalized)) return null;

  const [whole, fraction = ""] = normalized.split(".");
  return BigInt(whole) * BigInt(100) + BigInt((fraction + "00").slice(0, 2));
}

function splitTitleAndAuthor(value: string) {
  const clean = decodeBookIndexHtml(value);
  const separator = clean.lastIndexOf(" | ");

  if (separator <= 0 || separator >= clean.length - 3) {
    return { title: clean, authorName: null };
  }

  return {
    title: clean.slice(0, separator).trim(),
    authorName: clean.slice(separator + 3).trim() || null,
  };
}

export function parseInkilapBestsellers(
  html: string,
): BookIndexCollectionResult {
  const starts = [
    ...html.matchAll(
      /<div\b(?=[^>]*\bclass=["'][^"']*\bproductBox\b[^"']*["'])(?=[^>]*\bdata-barcode=["']([^"']*)["'])[^>]*>/giu,
    ),
  ];

  const books = starts
    .map((match, index) => {
      const start = match.index ?? 0;
      const end = starts[index + 1]?.index ?? html.length;
      const card = html.slice(start, end);
      const barcode = match[1]?.trim() ?? "";

      const productId = card.match(
        /\bdata-productid=["']([0-9]+)["']/iu,
      )?.[1];

      const nameMatch = card.match(
        /<p\b[^>]*\bclass=["'][^"']*\bitem-product-name\b[^"']*["'][^>]*>\s*<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/iu,
      );
      const publisher = card.match(
        /<p\b[^>]*\bclass=["'][^"']*\bitem-product-brand\b[^"']*["'][^>]*>\s*<a\b[^>]*>([\s\S]*?)<\/a>/iu,
      )?.[1];
      const image = card.match(
        /<img\b[^>]*\bclass=["'][^"']*\bitem-product-image\b[^"']*["'][^>]*\bsrc=["']([^"']+)["'][^>]*>/iu,
      )?.[1];
      const salePrice = card.match(
        /<span\b[^>]*\bclass=["'][^"']*\bsalePrice\b[^"']*["'][^>]*>([^<]+)<\/span>/iu,
      )?.[1];

      if (!nameMatch) {
        throw new Error("BOOK_INDEX_INKILAP_INVALID_ITEM");
      }

      const productUrl = nameMatch[1];
      const { title, authorName } = splitTitleAndAuthor(nameMatch[2]);
      if (!productUrl || !title) {
        throw new Error("BOOK_INDEX_INKILAP_INVALID_ITEM");
      }

      const normalizedIsbn = isbn13(barcode);

      return {
        sourceKey: barcode || productId || productUrl,
        sourceExternalId: productId ?? null,
        title,
        authorName,
        publisherName: publisher ? decodeBookIndexHtml(publisher) : null,
        isbn13: normalizedIsbn,
        productUrl: absoluteUrl(productUrl),
        imageUrl: image ? absoluteUrl(image) : null,
        rank: index + 1,
        priceAmount: salePrice
          ? priceToMinorUnits(decodeBookIndexHtml(salePrice))
          : null,
        currency: "TRY",
      };
    })
    .slice(0, MAX_BOOKS);

  if (books.length < MIN_EXPECTED_BOOKS) {
    throw new Error("BOOK_INDEX_INKILAP_RESULT_TOO_SMALL");
  }

  const uniqueKeys = new Set(books.map((book) => book.sourceKey));
  if (uniqueKeys.size !== books.length) {
    throw new Error("BOOK_INDEX_INKILAP_DUPLICATE_SOURCE_KEY");
  }

  return { books };
}

export const inkilapBookIndexAdapter: BookIndexSourceAdapter = {
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

    return parseInkilapBestsellers(await response.text());
  },
};
