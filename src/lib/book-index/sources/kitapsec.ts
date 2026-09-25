import type {
  BookIndexCollectionContext,
  BookIndexCollectionResult,
  BookIndexSourceAdapter,
} from "../adapter";
import { decodeBookIndexHtml } from "../html";

const SOURCE_CODE = "kitapsec";
const SOURCE_ORIGIN = "https://www.kitapsec.com";
const MAX_BOOKS = 48;
const MIN_EXPECTED_BOOKS = 20;

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

export function parseKitapSecBestsellers(
  html: string,
): BookIndexCollectionResult {
  const listSection = html.match(
    /<div\b(?=[^>]*\bclass=["'][^"']*\bKs_ContentUrunList\b[^"']*\burunListeleDiv\b[^"']*["'])(?=[^>]*\bitemtype=["']https:\/\/schema\.org\/ItemList["'])[^>]*>([\s\S]*?)<\/table>/iu,
  )?.[1];

  if (!listSection) {
    throw new Error("BOOK_INDEX_KITAPSEC_LIST_NOT_FOUND");
  }

  const starts = [
    ...listSection.matchAll(
      /<div\b(?=[^>]*\bclass=["'][^"']*\bKs_UrunSatir\b[^"']*["'])(?=[^>]*\bitemprop=["']itemListElement["'])(?=[^>]*\bid=["']([^"']+)["'])[^>]*>/giu,
    ),
  ];

  const books = starts
    .map((match, index) => {
      const start = match.index ?? 0;
      const end = starts[index + 1]?.index ?? listSection.length;
      const card = listSection.slice(start, end);
      const productId = match[1]?.trim() ?? "";

      const rankText = card.match(
        /<meta\b[^>]*\bitemprop=["']position["'][^>]*\bcontent=["']([0-9]+)["'][^>]*>/iu,
      )?.[1];
      const name = card.match(
        /<meta\b[^>]*\bitemprop=["']name["'][^>]*\bcontent=["']([^"']+)["'][^>]*>/iu,
      )?.[1];
      const productUrl = card.match(
        /<meta\b[^>]*\bitemprop=["']url["'][^>]*\bcontent=["']([^"']+)["'][^>]*>/iu,
      )?.[1];
      const image = card.match(
        /<meta\b[^>]*\bitemprop=["']image["'][^>]*\bcontent=["']([^"']+)["'][^>]*>/iu,
      )?.[1];
      const sku = card.match(
        /<meta\b[^>]*\bitemprop=["']sku["'][^>]*\bcontent=["']([^"']+)["'][^>]*>/iu,
      )?.[1];
      const price = card.match(
        /<meta\b[^>]*\bitemprop=["']price["'][^>]*\bcontent=["']([^"']+)["'][^>]*>/iu,
      )?.[1];
      const currency = card.match(
        /<meta\b[^>]*\bitemprop=["']priceCurrency["'][^>]*\bcontent=["']([^"']+)["'][^>]*>/iu,
      )?.[1];
      const publisher = card.match(
        /<span\b[^>]*\bclass=["'][^"']*\byynImg\b[^"']*["'][^>]*>[\s\S]*?<a\b[^>]*\btitle=["']([^"']+)["'][^>]*>/iu,
      )?.[1];

      const rank = Number(rankText);
      const title = name ? decodeBookIndexHtml(name) : "";
      if (!productId || !Number.isInteger(rank) || rank < 1 || !title || !productUrl) {
        throw new Error("BOOK_INDEX_KITAPSEC_INVALID_ITEM");
      }

      const normalizedIsbn = sku ? isbn13(sku) : null;

      return {
        sourceKey: normalizedIsbn || productId,
        sourceExternalId: productId,
        title,
        authorName: null,
        publisherName: publisher ? decodeBookIndexHtml(publisher) : null,
        isbn13: normalizedIsbn,
        productUrl: absoluteUrl(productUrl),
        imageUrl: image ? absoluteUrl(image) : null,
        rank,
        priceAmount: price ? priceToMinorUnits(price) : null,
        currency: currency ? decodeBookIndexHtml(currency) : "TRY",
      };
    })
    .sort((a, b) => a.rank - b.rank)
    .slice(0, MAX_BOOKS);

  if (books.length < MIN_EXPECTED_BOOKS) {
    throw new Error("BOOK_INDEX_KITAPSEC_RESULT_TOO_SMALL");
  }

  const uniqueKeys = new Set(books.map((book) => book.sourceKey));
  const uniqueRanks = new Set(books.map((book) => book.rank));
  if (uniqueKeys.size !== books.length || uniqueRanks.size !== books.length) {
    throw new Error("BOOK_INDEX_KITAPSEC_DUPLICATE_ITEM");
  }

  if (books.some((book, index) => book.rank !== index + 1)) {
    throw new Error("BOOK_INDEX_KITAPSEC_RANK_SEQUENCE_INVALID");
  }

  return { books };
}

export const kitapSecBookIndexAdapter: BookIndexSourceAdapter = {
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

    const bytes = await response.arrayBuffer();
    const html = new TextDecoder("windows-1254").decode(bytes);
    return parseKitapSecBestsellers(html);
  },
};
