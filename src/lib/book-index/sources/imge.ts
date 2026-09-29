import type {
  BookIndexCollectionContext,
  BookIndexCollectionResult,
  BookIndexSourceAdapter,
} from "../adapter";
import { decodeBookIndexHtml } from "../html";

const SOURCE_CODE = "imge";
const SOURCE_ORIGIN = "https://www.imge.com.tr";
const MAX_BOOKS = 100;
const MIN_EXPECTED_BOOKS = 20;

function absoluteUrl(value: string) {
  return new URL(value, SOURCE_ORIGIN).toString();
}

function attributeValue(fragment: string, name: string) {
  const match = fragment.match(
    new RegExp(`\\b${name}=(["'])([\\s\\S]*?)\\1`, "iu"),
  );
  return match?.[2] ? decodeBookIndexHtml(match[2]) : "";
}

function normalizeText(value: string | undefined) {
  return decodeBookIndexHtml(value ?? "").replace(/\s+/gu, " ").trim();
}

function isbnFromValue(value: string) {
  const match = value.match(/\b(?:978|979)[0-9]{10}\b/u);
  return match?.[0] ?? null;
}

function salesSortedUrl(sourceUrl: string) {
  const url = new URL(sourceUrl);

  if (url.origin !== SOURCE_ORIGIN || url.pathname !== "/etiket/cok-satanlar") {
    throw new Error("BOOK_INDEX_IMGE_SOURCE_URL_MISMATCH");
  }

  url.searchParams.set("sort_type", "7");
  url.searchParams.set("size", "100");
  return url.toString();
}

export function parseImgeBestsellers(
  html: string,
): BookIndexCollectionResult {
  if (
    !/filterList:\{[\s\S]{0,1400}?sort_type:["']7["']/u.test(html)
    && !/sort_type:["']7["']/u.test(html)
  ) {
    throw new Error("BOOK_INDEX_IMGE_SALES_SORT_NOT_APPLIED");
  }

  const starts = [
    ...html.matchAll(
      /<a\b(?=[^>]*\bhref=(["'])([^"']*\/urun\/[^"']+)\1)[^>]*>\s*<img\b[^>]*>/giu,
    ),
  ];

  const books = [];
  const seenUrls = new Set<string>();

  for (let index = 0; index < starts.length && books.length < MAX_BOOKS; index += 1) {
    const match = starts[index];
    const href = match[2]?.trim() ?? "";
    if (!href) continue;

    const productUrl = absoluteUrl(href);
    if (seenUrls.has(productUrl)) continue;

    const start = match.index ?? 0;
    const end = starts[index + 1]?.index ?? Math.min(html.length, start + 7000);
    const card = html.slice(start, end);

    const imageTag = card.match(/<img\b[^>]*>/iu)?.[0] ?? "";
    const alt = attributeValue(imageTag, "alt");
    const imageSrc = attributeValue(imageTag, "src");

    const title = normalizeText(
      card.match(/<h5\b[^>]*\btitle=(["'])([\s\S]*?)\1[^>]*>/iu)?.[2],
    );

    const authorMatches = [
      ...card.matchAll(
        /<a\b[^>]*\bhref=(["'])\/kisi\/[^"']+\1[^>]*>([\s\S]*?)<\/a>/giu,
      ),
    ]
      .map((author) => normalizeText(author[2]))
      .filter(Boolean);
    const authors = [...new Set(authorMatches)];

    const publisher = normalizeText(
      card.match(
        /<a\b[^>]*\bhref=(["'])\/uretici\/[^"']+\1[^>]*>[\s\S]*?<span\b[^>]*>([\s\S]*?)<\/span>/iu,
      )?.[2],
    );

    const isbn13 = isbnFromValue(href) ?? isbnFromValue(alt);

    if (!title || !isbn13 || authors.length === 0 || !publisher) {
      throw new Error("BOOK_INDEX_IMGE_INVALID_ITEM");
    }

    books.push({
      sourceKey: isbn13,
      sourceExternalId: isbn13,
      title,
      authorName: authors.join(";"),
      publisherName: publisher,
      isbn13,
      productUrl,
      imageUrl: imageSrc ? absoluteUrl(imageSrc) : null,
      rank: books.length + 1,
      currency: "TRY",
    });
    seenUrls.add(productUrl);
  }

  if (books.length < MIN_EXPECTED_BOOKS) {
    throw new Error(`BOOK_INDEX_IMGE_RESULT_TOO_SMALL:${books.length}`);
  }

  if (books.length > MAX_BOOKS) {
    throw new Error("BOOK_INDEX_IMGE_RESULT_TOO_LARGE");
  }

  const sourceKeys = new Set(books.map((book) => book.sourceKey));
  if (sourceKeys.size !== books.length) {
    throw new Error("BOOK_INDEX_IMGE_DUPLICATE_SOURCE_KEY");
  }

  if (books.some((book, index) => book.rank !== index + 1)) {
    throw new Error("BOOK_INDEX_IMGE_RANK_ORDER_MISMATCH");
  }

  return { books };
}

async function fetchHtml(url: string) {
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

export const imgeBookIndexAdapter: BookIndexSourceAdapter = {
  sourceCode: SOURCE_CODE,
  async collect(
    context: BookIndexCollectionContext,
  ): Promise<BookIndexCollectionResult> {
    if (context.listCode !== "imge-tr-live") {
      throw new Error("BOOK_INDEX_IMGE_LIST_NOT_SUPPORTED");
    }

    return parseImgeBestsellers(
      await fetchHtml(salesSortedUrl(context.sourceUrl)),
    );
  },
};
