import type {
  BookIndexCollectionContext,
  BookIndexCollectionResult,
  BookIndexSourceAdapter,
} from "../adapter";
import { decodeBookIndexHtml } from "../html";

const SOURCE_CODE = "illakitap";
const SOURCE_ORIGIN = "https://www.illakitap.com";
const MAX_BOOKS = 100;
const MIN_EXPECTED_BOOKS = 40;

function absoluteUrl(value: string) {
  return new URL(value, SOURCE_ORIGIN).toString();
}

export function parseIllaKitapWeeklyBestsellers(
  html: string,
): BookIndexCollectionResult {
  const starts = [
    ...html.matchAll(
      /<div\b(?=[^>]*\bclass=["'][^"']*\bProduct_([0-9]+)\b[^"']*["'])[^>]*>/giu,
    ),
  ];

  const books = starts
    .map((match, index) => {
      const start = match.index ?? 0;
      const end = starts[index + 1]?.index ?? html.length;
      const card = html.slice(start, end);
      const productId = match[1]?.trim() ?? "";

      const titleMatch = card.match(
        /<a\b(?=[^>]*\bclass=["'][^"']*\btooltip-ajax\b[^"']*["'])(?=[^>]*\bhref=["']([^"']+)["'])[^>]*>([\s\S]*?)<\/a>/iu,
      );
      const author = card.match(
        /<div\b[^>]*\bclass=["'][^"']*\bwriter\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/iu,
      )?.[1];
      const publisher = card.match(
        /<div\b[^>]*\bclass=["'][^"']*\bpublisher\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/iu,
      )?.[1];
      const image = card.match(
        /<img\b[^>]*\bclass=["'][^"']*\bprd_img\b[^"']*["'][^>]*\b(?:data-src|src)=["']([^"']+)["'][^>]*>/iu,
      )?.[1];

      if (!titleMatch || !productId) {
        throw new Error("BOOK_INDEX_ILLAKITAP_INVALID_ITEM");
      }

      const productUrl = titleMatch[1]?.trim() ?? "";
      const title = decodeBookIndexHtml(titleMatch[2] ?? "");
      if (!productUrl || !title) {
        throw new Error("BOOK_INDEX_ILLAKITAP_INVALID_ITEM");
      }

      return {
        sourceKey: productId,
        sourceExternalId: productId,
        title,
        authorName: author ? decodeBookIndexHtml(author) : null,
        publisherName: publisher ? decodeBookIndexHtml(publisher) : null,
        productUrl: absoluteUrl(productUrl),
        imageUrl: image ? absoluteUrl(image) : null,
        rank: index + 1,
        currency: "TRY",
      };
    })
    .slice(0, MAX_BOOKS);

  if (books.length < MIN_EXPECTED_BOOKS) {
    throw new Error("BOOK_INDEX_ILLAKITAP_RESULT_TOO_SMALL");
  }

  const uniqueKeys = new Set(books.map((book) => book.sourceKey));
  if (uniqueKeys.size !== books.length) {
    throw new Error("BOOK_INDEX_ILLAKITAP_DUPLICATE_SOURCE_KEY");
  }

  return { books };
}

export const illaKitapBookIndexAdapter: BookIndexSourceAdapter = {
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

    return parseIllaKitapWeeklyBestsellers(await response.text());
  },
};
