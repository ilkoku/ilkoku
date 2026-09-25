import type {
  BookIndexCollectionContext,
  BookIndexCollectionResult,
  BookIndexSourceAdapter,
} from "../adapter";
import { decodeBookIndexHtml } from "../html";

const SOURCE_CODE = "nobelkitap";
const SOURCE_ORIGIN = "https://www.nobelkitap.com";
const MAX_BOOKS = 50;
const MIN_EXPECTED_BOOKS = 40;

function absoluteUrl(value: string) {
  return new URL(value, SOURCE_ORIGIN).toString();
}

function isbn13FromProductUrl(value: string) {
  const pathname = new URL(value, SOURCE_ORIGIN).pathname;
  const match = pathname.match(/-(97[89][0-9]{10})$/u);
  return match?.[1] ?? null;
}

function productSlug(value: string) {
  const pathname = new URL(value, SOURCE_ORIGIN).pathname;
  return pathname.split("/").filter(Boolean).at(-1) ?? "";
}

export function parseNobelKitapBestsellers(
  html: string,
): BookIndexCollectionResult {
  const starts = [
    ...html.matchAll(
      /<a\b(?=[^>]*\bclass=["'][^"']*\bgroup\b[^"']*\bblock\b[^"']*\bh-full\b[^"']*["'])(?=[^>]*\bhref=["']([^"']*\/kitap\/[^"']+)["'])[^>]*>/giu,
    ),
  ];

  const books = starts
    .map((match, index) => {
      const start = match.index ?? 0;
      const end = starts[index + 1]?.index ?? html.length;
      const card = html.slice(start, end);
      const productUrl = match[1]?.trim() ?? "";

      const title = card.match(
        /<h3\b[^>]*\bclass=["'][^"']*\bfont-medium\b[^"']*\btext-gray-900\b[^"']*["'][^>]*>([\s\S]*?)<\/h3>/iu,
      )?.[1];
      const author = card.match(
        /<p\b[^>]*\bclass=["'][^"']*\btext-xs\b[^"']*\btext-gray-600\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/iu,
      )?.[1];

      if (!productUrl || !title || !author) {
        throw new Error("BOOK_INDEX_NOBELKITAP_INVALID_ITEM");
      }

      const decodedTitle = decodeBookIndexHtml(title);
      const decodedAuthor = decodeBookIndexHtml(author);
      const slug = productSlug(productUrl);
      const isbn13 = isbn13FromProductUrl(productUrl);

      if (!decodedTitle || !decodedAuthor || !slug) {
        throw new Error("BOOK_INDEX_NOBELKITAP_INVALID_ITEM");
      }

      return {
        sourceKey: isbn13 || slug,
        sourceExternalId: slug,
        title: decodedTitle,
        authorName: decodedAuthor,
        publisherName: null,
        isbn13,
        productUrl: absoluteUrl(productUrl),
        rank: index + 1,
        currency: "TRY",
      };
    })
    .slice(0, MAX_BOOKS);

  if (books.length < MIN_EXPECTED_BOOKS) {
    throw new Error("BOOK_INDEX_NOBELKITAP_RESULT_TOO_SMALL");
  }

  const uniqueKeys = new Set(books.map((book) => book.sourceKey));
  if (uniqueKeys.size !== books.length) {
    throw new Error("BOOK_INDEX_NOBELKITAP_DUPLICATE_SOURCE_KEY");
  }

  return { books };
}

export const nobelKitapBookIndexAdapter: BookIndexSourceAdapter = {
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

    return parseNobelKitapBestsellers(await response.text());
  },
};
