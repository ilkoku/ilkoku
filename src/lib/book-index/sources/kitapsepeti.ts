import type {
  BookIndexCollectionContext,
  BookIndexCollectionResult,
  BookIndexSourceAdapter,
} from "../adapter";
import { decodeBookIndexHtml } from "../html";

const SOURCE_CODE = "kitapsepeti";
const SOURCE_ORIGIN = "https://www.kitapsepeti.com";
const MAX_BOOKS = 100;
const PAGE_COUNT = 4;
const MIN_EXPECTED_BOOKS = 20;
const VERIFIED_NON_BOOK_SOURCE_KEYS = new Set([
  "/3-in-1-puzzle",
  "/ntt-magnum-jel-kalem-hediyeli-6-li-defter-love",
  "/ntt-magnum-jel-kalem-hediyeli-6-li-defter-geometri",
  "/kuromi-1006-10-renk-tukenmez-kalem",
  "/note-the-time-2li-defter-set-soft-pastel-buyuk-ve-kucuk-cizgisiz",
  "/kenko-kk-613d-dijital-kucuk-masa-araba-saati-alarm-kronometre",
  "/canli-cicek-kitap-ayraci",
]);

function absoluteUrl(href: string) {
  return new URL(href, SOURCE_ORIGIN).toString();
}

function priceToMinorUnits(value: string) {
  const normalized = value.replace(/\./gu, "").replace(",", ".").trim();
  if (!/^[0-9]+(?:\.[0-9]{1,2})?$/u.test(normalized)) return null;

  const [whole, fraction = ""] = normalized.split(".");
  return BigInt(whole) * BigInt(100) + BigInt((fraction + "00").slice(0, 2));
}

export function parseKitapSepetiBestsellers(
  html: string,
): BookIndexCollectionResult {
  const catalog = html.match(
    /<div\b[^>]*id=["']catalog\d+["'][^>]*>([\s\S]*?)(?=<div\b[^>]*class=["'][^"']*folder-products-bottom|<footer\b|$)/iu,
  )?.[1];

  if (!catalog) {
    throw new Error("BOOK_INDEX_KITAPSEPETI_CATALOG_NOT_FOUND");
  }

  const cardStarts = [
    ...catalog.matchAll(
      /<div\b[^>]*class=["'][^"']*\sproduct-item(?:\s[^"']*)?["'][^>]*>/giu,
    ),
  ];

  const cards = cardStarts.map((match, index) => {
    const start = match.index ?? 0;
    const end =
      cardStarts[index + 1]?.index ??
      catalog.length;
    return catalog.slice(start, end);
  });

  const books = cards
    .map((card, index) => {
      const titleMatch = card.match(
        /<a\b(?=[^>]*\bclass=["'][^"']*\bproduct-title\b[^"']*["'])(?=[^>]*\bhref=["']([^"']+)["'])[^>]*>([\s\S]*?)<\/a>/iu,
      );
      if (!titleMatch) return null;

      const href = titleMatch[1];
      const title = decodeBookIndexHtml(titleMatch[2]);
      const publisher = card.match(
        /<a\b[^>]*\bclass=["'][^"']*\bbrand-title\b[^"']*["'][^>]*>([\s\S]*?)<\/a>/iu,
      )?.[1];
      const author = card.match(
        /<a\b[^>]*\bclass=["'][^"']*\bmodel-title\b[^"']*["'][^>]*>([\s\S]*?)<\/a>/iu,
      )?.[1];
      const image = card.match(
        /<img\b[^>]*\bdata-src=["']([^"']+)["'][^>]*>/iu,
      )?.[1];
      const price = card.match(
        /<span\b[^>]*\bclass=["'][^"']*\bproduct-price\b[^"']*["'][^>]*>([^<]+)<\/span>/iu,
      )?.[1];

      if (!href || !title) {
        throw new Error("BOOK_INDEX_KITAPSEPETI_INVALID_ITEM");
      }

      // Verified live catalogue exception: this source item is a physical puzzle, not a book.
      if (VERIFIED_NON_BOOK_SOURCE_KEYS.has(href)) return null;

      return {
        sourceKey: href,
        title,
        authorName: author ? decodeBookIndexHtml(author) : null,
        publisherName: publisher ? decodeBookIndexHtml(publisher) : null,
        productUrl: absoluteUrl(href),
        imageUrl: image ? absoluteUrl(image) : null,
        rank: index + 1,
        priceAmount: price ? priceToMinorUnits(decodeBookIndexHtml(price)) : null,
        currency: "TRY",
      };
    })
    .filter((book): book is NonNullable<typeof book> => Boolean(book))
    .slice(0, MAX_BOOKS)
    .map((book, index) => ({
      ...book,
      rank: index + 1,
    }));

  if (books.length < MIN_EXPECTED_BOOKS) {
    throw new Error(`BOOK_INDEX_KITAPSEPETI_RESULT_TOO_SMALL:${books.length}`);
  }

  const uniqueKeys = new Set(books.map((book) => book.sourceKey));
  if (uniqueKeys.size !== books.length) {
    throw new Error("BOOK_INDEX_KITAPSEPETI_DUPLICATE_SOURCE_KEY");
  }

  return { books };
}

function bestsellerPageUrl(sourceUrl: string, page: number) {
  if (page === 1) return sourceUrl;

  const url = new URL(sourceUrl);
  url.searchParams.set("pg", String(page));
  return url.toString();
}

async function fetchHtml(url: string) {
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

export const kitapSepetiBookIndexAdapter: BookIndexSourceAdapter = {
  sourceCode: SOURCE_CODE,
  async collect(
    context: BookIndexCollectionContext,
  ): Promise<BookIndexCollectionResult> {
    const pageResults = [];

    for (let page = 1; page <= PAGE_COUNT; page += 1) {
      const html = await fetchHtml(bestsellerPageUrl(context.sourceUrl, page));
      pageResults.push(parseKitapSepetiBestsellers(html));
    }

    const books = pageResults
      .flatMap((result) => result.books)
      .slice(0, MAX_BOOKS)
      .map((book, index) => ({
        ...book,
        rank: index + 1,
      }));

    if (books.length < MAX_BOOKS) {
      throw new Error(`BOOK_INDEX_KITAPSEPETI_RESULT_TOO_SMALL:${books.length}`);
    }

    const uniqueKeys = new Set(books.map((book) => book.sourceKey));
    if (uniqueKeys.size !== books.length) {
      throw new Error("BOOK_INDEX_KITAPSEPETI_DUPLICATE_SOURCE_KEY");
    }

    return { books };
  },
};
