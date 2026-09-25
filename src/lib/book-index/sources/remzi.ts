import type {
  BookIndexCollectionContext,
  BookIndexCollectionResult,
  BookIndexSourceAdapter,
} from "../adapter";
import { decodeBookIndexHtml } from "../html";

const SOURCE_CODE = "remzi";
const SOURCE_ORIGIN = "https://www.remzi.com.tr";
const MIN_EXPECTED_BOOKS = 10;

function absoluteUrl(href: string) {
  return new URL(href, SOURCE_ORIGIN).toString();
}

export function parseRemziWeeklyBestsellers(
  html: string,
): BookIndexCollectionResult {
  const section = html.match(
    /<ol\b[^>]*class=["'][^"']*\bturkish-books\b[^"']*["'][^>]*>([\s\S]*?)<\/ol>/iu,
  )?.[1];

  if (!section) {
    throw new Error("BOOK_INDEX_REMZI_LIST_NOT_FOUND");
  }

  const itemBlocks = [
    ...section.matchAll(/<li\b[^>]*>([\s\S]*?)(?=<li\b|$)/giu),
  ];

  const books = itemBlocks.flatMap((match, index) => {
    const item = match[1];
    const bookAnchor = item.match(
      /<a\b(?=[^>]*\bclass=["'][^"']*\bbook-name\b[^"']*["'])(?=[^>]*\bhref=["']([^"']+)["'])[^>]*>([\s\S]*?)<\/a>/iu,
    );

    if (!bookAnchor) return [];

    const href = bookAnchor[1];
    const title = decodeBookIndexHtml(bookAnchor[2]);
    if (!href || !title) return [];

    const author = item.match(
      /<a\b[^>]*href=["']\/yazar\/[^"']+["'][^>]*>\s*<h4\b[^>]*>([\s\S]*?)<\/h4>/iu,
    )?.[1];
    const publisher = item.match(
      /<span\b[^>]*>[\s\S]*?\(([^()<>]+)\)\s*<\/span>/iu,
    )?.[1];

    return [
      {
        sourceKey: href,
        title,
        authorName: author ? decodeBookIndexHtml(author) : null,
        publisherName: publisher ? decodeBookIndexHtml(publisher) : null,
        productUrl: absoluteUrl(href),
        rank: index + 1,
      },
    ];
  });

  if (books.length < MIN_EXPECTED_BOOKS) {
    throw new Error("BOOK_INDEX_REMZI_RESULT_TOO_SMALL");
  }

  return { books };
}

export const remziBookIndexAdapter: BookIndexSourceAdapter = {
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

    const html = await response.text();
    return parseRemziWeeklyBestsellers(html);
  },
};
