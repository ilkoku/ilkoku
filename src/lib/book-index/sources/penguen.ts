import type {
  BookIndexCollectionContext,
  BookIndexCollectionResult,
  BookIndexSourceAdapter,
} from "../adapter";
import { decodeBookIndexHtml } from "../html";

const SOURCE_CODE = "penguen";
const SOURCE_ORIGIN = "https://www.penguenkitap.com.tr";
const BESTSELLER_PATH = "/urunler/cok-satanlar";
const MIN_EXPECTED_BOOKS = 4;

function normalizeText(value: string | undefined) {
  return decodeBookIndexHtml(value ?? "")
    .replace(/<[^>]+>/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function attributeValue(fragment: string, name: string) {
  const match = fragment.match(
    new RegExp(`\\b${name}=(["'])([\\s\\S]*?)\\1`, "iu"),
  );
  return match?.[2] ? decodeBookIndexHtml(match[2]) : "";
}

function verifiedSourceUrl(sourceUrl: string) {
  const url = new URL(sourceUrl);
  if (url.origin !== SOURCE_ORIGIN || url.pathname !== BESTSELLER_PATH) {
    throw new Error("BOOK_INDEX_PENGUEN_SOURCE_URL_MISMATCH");
  }
  url.search = "";
  url.hash = "";
  return url.toString();
}

export function parsePenguenBestsellers(
  html: string,
): BookIndexCollectionResult {
  const pageText = normalizeText(html);
  if (!/Çok\s+Satan/iu.test(pageText)) {
    throw new Error("BOOK_INDEX_PENGUEN_BESTSELLER_MARKER_MISSING");
  }

  const matches = [
    ...html.matchAll(
      /<a\b(?=[^>]*\bhref=(["'])([^"']*\/urun\/([^"'?#]+)[^"']*)\1)[^>]*>([\s\S]*?)<\/a>/giu,
    ),
  ];

  const firstBySlug = new Map<
    string,
    { href: string; title: string; imageUrl: string | null }
  >();

  for (const match of matches) {
    const href = match[2]?.trim() ?? "";
    const slug = match[3]?.trim() ?? "";
    const inner = match[4] ?? "";
    if (!href || !slug || firstBySlug.has(slug)) continue;

    const imageTag = inner.match(/<img\b[^>]*>/iu)?.[0] ?? "";
    const imageAlt = attributeValue(imageTag, "alt");
    const imageSrc =
      attributeValue(imageTag, "src")
      || attributeValue(imageTag, "data-src");
    const linkedText = normalizeText(inner);
    const title =
      (linkedText && !/^Ürünü\s+İncele$/iu.test(linkedText) ? linkedText : "")
      || imageAlt;

    if (!title) continue;

    firstBySlug.set(slug, {
      href: new URL(href, SOURCE_ORIGIN).toString(),
      title,
      imageUrl: imageSrc ? new URL(imageSrc, SOURCE_ORIGIN).toString() : null,
    });
  }

  const entries = [...firstBySlug.entries()];
  if (entries.length < MIN_EXPECTED_BOOKS) {
    throw new Error(
      `BOOK_INDEX_PENGUEN_RESULT_TOO_SMALL:${entries.length}`,
    );
  }

  const books = entries.map(([slug, item], index) => ({
    sourceKey: slug,
    sourceExternalId: slug,
    title: item.title,
    authorName: null,
    publisherName: null,
    productUrl: item.href,
    imageUrl: item.imageUrl,
    rank: index + 1,
    currency: "TRY",
  }));

  if (new Set(books.map((book) => book.sourceKey)).size !== books.length) {
    throw new Error("BOOK_INDEX_PENGUEN_DUPLICATE_SOURCE_KEY");
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

export const penguenBookIndexAdapter: BookIndexSourceAdapter = {
  sourceCode: SOURCE_CODE,
  async collect(
    context: BookIndexCollectionContext,
  ): Promise<BookIndexCollectionResult> {
    if (context.listCode !== "penguen-tr-bestsellers") {
      throw new Error("BOOK_INDEX_PENGUEN_LIST_UNSUPPORTED");
    }

    return parsePenguenBestsellers(
      await fetchHtml(verifiedSourceUrl(context.sourceUrl)),
    );
  },
};
