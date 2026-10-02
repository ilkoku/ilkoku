import type {
  BookIndexCollectionContext,
  BookIndexCollectionResult,
  BookIndexSourceAdapter,
} from "../adapter";
import { decodeBookIndexHtml } from "../html";

const SOURCE_CODE = "kitapyurdu";
const SOURCE_ORIGIN = "https://www.kitapyurdu.com";
const WEEKLY_GENERAL_PATH = "/cok-satan-kitaplar/haftalik/1.html";
const WEEKLY_NEW_RELEASES_PATH = "/yeni-cikan-kitaplar/haftalik/2.html";
const EXACT_EXPECTED_BOOKS = 20;

function absoluteUrl(value: string) {
  return new URL(value, SOURCE_ORIGIN).toString();
}

function normalizeText(value: string | undefined) {
  return decodeBookIndexHtml(value ?? "").replace(/\s+/gu, " ").trim();
}

function attributeValue(fragment: string, name: string) {
  const match = fragment.match(
    new RegExp(`\\b${name}=(["'])([\\s\\S]*?)\\1`, "iu"),
  );
  return match?.[2] ? decodeBookIndexHtml(match[2]) : "";
}

function verifiedResearchUrl(sourceUrl: string, expectedPath: string) {
  const url = new URL(sourceUrl);

  if (url.origin !== SOURCE_ORIGIN || url.pathname !== expectedPath) {
    throw new Error("BOOK_INDEX_KITAPYURDU_SOURCE_URL_MISMATCH");
  }

  url.search = "";
  url.hash = "";
  return url.toString();
}

type ProductAnchor = {
  index: number;
  href: string;
  productId: string;
};

function productAnchors(html: string): ProductAnchor[] {
  const matches = [
    ...html.matchAll(
      /<a\b(?=[^>]*\bhref=(["'])([^"']*\/kitap\/[^"']+\/(\d+)\.html(?:\?[^"']*)?)\1)[^>]*>([\s\S]*?)<\/a>/giu,
    ),
  ];

  const firstByProduct = new Map<string, ProductAnchor>();
  for (const match of matches) {
    const productId = match[3]?.trim() ?? "";
    const href = match[2]?.trim() ?? "";
    if (!productId || !href || firstByProduct.has(productId)) continue;

    firstByProduct.set(productId, {
      index: match.index ?? 0,
      href,
      productId,
    });
  }

  return [...firstByProduct.values()].sort((left, right) => left.index - right.index);
}

function linkedTexts(card: string, pathPrefix: "yazar" | "yayinevi") {
  return [
    ...card.matchAll(
      new RegExp(
        `<a\\b(?=[^>]*\\bhref=(["'])[^"']*/${pathPrefix}/[^"']+\\1)[^>]*>([\\s\\S]*?)<\\/a>`,
        "giu",
      ),
    ),
  ]
    .map((match) => normalizeText(match[2]))
    .filter(Boolean);
}

function parseVerifiedBookPage(
  html: string,
  marker: string,
  description: string,
  markerError: string,
): BookIndexCollectionResult {
  const pageText = normalizeText(html);
  if (!pageText.includes(marker) || !pageText.includes(description)) {
    throw new Error(markerError);
  }

  const anchors = productAnchors(html);
  const books = anchors.map((anchor, index) => {
    const next = anchors[index + 1];
    const card = html.slice(anchor.index, next?.index ?? html.length);

    const sameProductTitles = [
      ...card.matchAll(
        new RegExp(
          `<a\\b(?=[^>]*\\bhref=(["'])[^"']*/kitap/[^"']+/${anchor.productId}\\.html(?:\\?[^"']*)?\\1)[^>]*>([\\s\\S]*?)<\\/a>`,
          "giu",
        ),
      ),
    ]
      .map((match) => normalizeText(match[2]))
      .filter(Boolean);

    const imageTag = card.match(/<img\b[^>]*>/iu)?.[0] ?? "";
    const imageAlt = attributeValue(imageTag, "alt");
    const imageSrc = attributeValue(imageTag, "src");
    const title = sameProductTitles.sort((a, b) => b.length - a.length)[0] || imageAlt;

    const authors = [...new Set(linkedTexts(card, "yazar"))];
    const publishers = [...new Set(linkedTexts(card, "yayinevi"))];

    if (!title || authors.length === 0 || publishers.length !== 1) {
      throw new Error("BOOK_INDEX_KITAPYURDU_INVALID_ITEM");
    }

    return {
      sourceKey: anchor.productId,
      sourceExternalId: anchor.productId,
      title,
      authorName: authors.join(";"),
      publisherName: publishers[0],
      productUrl: absoluteUrl(anchor.href),
      imageUrl: imageSrc ? absoluteUrl(imageSrc) : null,
      rank: index + 1,
      currency: "TRY",
    };
  });

  if (books.length !== EXACT_EXPECTED_BOOKS) {
    throw new Error(`BOOK_INDEX_KITAPYURDU_UNEXPECTED_PAGE_SIZE:${books.length}`);
  }

  const sourceKeys = new Set(books.map((book) => book.sourceKey));
  if (sourceKeys.size !== books.length) {
    throw new Error("BOOK_INDEX_KITAPYURDU_DUPLICATE_SOURCE_KEY");
  }

  if (books.some((book, index) => book.rank !== index + 1)) {
    throw new Error("BOOK_INDEX_KITAPYURDU_RANK_ORDER_MISMATCH");
  }

  return { books };
}

export function parseKitapyurduWeeklyBestsellers(
  html: string,
): BookIndexCollectionResult {
  return parseVerifiedBookPage(
    html,
    "Çok Satanlar (Genel, Haftalık)",
    "Son 7 gün içerisinde en çok satın alınan ürünler",
    "BOOK_INDEX_KITAPYURDU_WEEKLY_GENERAL_MARKER_MISSING",
  );
}

export function parseKitapyurduWeeklyNewReleases(
  html: string,
): BookIndexCollectionResult {
  return parseVerifiedBookPage(
    html,
    "Yeni Çıkanlar (Genel, Haftalık)",
    "Son 7 gün içerisindeki yeni çıkan ürünler",
    "BOOK_INDEX_KITAPYURDU_NEW_RELEASE_MARKER_MISSING",
  );
}

async function fetchHtml(sourceUrl: string, expectedPath: string) {
  const response = await fetch(verifiedResearchUrl(sourceUrl, expectedPath), {
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

// Collector adapter for the verified weekly bestseller and new-release surfaces.
export const kitapyurduBookIndexAdapter: BookIndexSourceAdapter = {
  sourceCode: SOURCE_CODE,
  async collect(
    context: BookIndexCollectionContext,
  ): Promise<BookIndexCollectionResult> {
    if (context.listCode === "kitapyurdu-tr-weekly") {
      return parseKitapyurduWeeklyBestsellers(
        await fetchHtml(context.sourceUrl, WEEKLY_GENERAL_PATH),
      );
    }

    if (context.listCode === "kitapyurdu-tr-new-releases") {
      return parseKitapyurduWeeklyNewReleases(
        await fetchHtml(context.sourceUrl, WEEKLY_NEW_RELEASES_PATH),
      );
    }

    throw new Error("BOOK_INDEX_KITAPYURDU_LIST_NOT_SUPPORTED");
  },
};
