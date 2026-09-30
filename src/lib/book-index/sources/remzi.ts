import type {
  BookIndexCollectionContext,
  BookIndexCollectionResult,
  BookIndexSourceAdapter,
} from "../adapter";
import { decodeBookIndexHtml } from "../html";

const SOURCE_CODE = "remzi";
const SOURCE_ORIGIN = "https://www.remzi.com.tr";
const MIN_EXPECTED_BOOKS = 10;

// Remzi's native detail pages omit the author field for these two exact
// editions. Exact ISBN matches on multiple book catalogues identify them as
// collective works; keep the fallback path-specific to avoid title guessing.
const VERIFIED_NEW_RELEASE_AUTHOR_BY_PATH = new Map<string, string>([
  ["/kitap/sevimli-cikartmali-neseli-kafeler", "Kolektif"],
  ["/kitap/sevimli-cikartmali-neseli-yuvalar", "Kolektif"],
]);

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

export function parseRemziNewReleases(
  html: string,
): BookIndexCollectionResult {
  const headingIndex = html.search(
    /<h3\b[^>]*>\s*En\s+Yeniler\s*<\/h3>/iu,
  );

  if (headingIndex < 0) {
    throw new Error("BOOK_INDEX_REMZI_NEW_RELEASE_HEADING_MISSING");
  }

  const afterHeading = html.slice(headingIndex);
  const listEnd = afterHeading.search(
    /<div\b[^>]*class=["'][^"']*\bpagination\b[^"']*["'][^>]*>/iu,
  );
  const listBody = listEnd >= 0 ? afterHeading.slice(0, listEnd) : afterHeading;

  const starts = [
    ...listBody.matchAll(
      /<div\b[^>]*class=["']book["'][^>]*>/giu,
    ),
  ];

  const books = starts.map((match, index) => {
    const start = match.index ?? 0;
    const end = starts[index + 1]?.index ?? listBody.length;
    const card = listBody.slice(start, end);

    const titleAnchor = card.match(
      /<h4\b[^>]*>\s*<a\b[^>]*href=["'](\/kitap\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>\s*<\/h4>/iu,
    );
    const author = card.match(
      /<a\b[^>]*href=["']\/yazar\/[^"']+["'][^>]*>\s*<h4\b[^>]*>([\s\S]*?)<\/h4>\s*<\/a>/iu,
    )?.[1];
    const image = card.match(
      /<div\b[^>]*class=["'][^"']*\bbook-image\b[^"']*["'][^>]*>[\s\S]*?<img\b[^>]*src=["']([^"']+)["'][^>]*>/iu,
    )?.[1];

    const href = titleAnchor?.[1] ?? "";
    const title = decodeBookIndexHtml(titleAnchor?.[2] ?? "");

    if (!href || !title) {
      throw new Error("BOOK_INDEX_REMZI_NEW_RELEASE_INVALID_ITEM");
    }

    return {
      sourceKey: href,
      title,
      authorName:
        (author ? decodeBookIndexHtml(author) : null)
        || VERIFIED_NEW_RELEASE_AUTHOR_BY_PATH.get(href)
        || null,
      publisherName: null,
      productUrl: absoluteUrl(href),
      imageUrl: image ? absoluteUrl(image) : null,
      rank: index + 1,
    };
  });

  if (books.length < MIN_EXPECTED_BOOKS) {
    throw new Error("BOOK_INDEX_REMZI_NEW_RELEASE_RESULT_TOO_SMALL");
  }

  const uniqueKeys = new Set(books.map((book) => book.sourceKey));
  if (uniqueKeys.size !== books.length) {
    throw new Error("BOOK_INDEX_REMZI_NEW_RELEASE_DUPLICATE_SOURCE_KEY");
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

    if (context.listCode === "remzi-tr-new-releases") {
      return parseRemziNewReleases(html);
    }

    return parseRemziWeeklyBestsellers(html);
  },
};
