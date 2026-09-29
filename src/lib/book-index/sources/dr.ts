import type {
  BookIndexCollectedBook,
  BookIndexCollectionResult,
} from "../adapter";
import { decodeBookIndexHtml } from "../html";

const SOURCE_ORIGIN = "https://www.dr.com.tr";
const BESTSELLER_PATH = "/kategori_/kitap/cok-satanlar/10001/12";
const NEW_RELEASES_PATH = "/kategori_/kitap/en-yeniler/10001/3";
const EXACT_EXPECTED_CANDIDATES = 40;

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

function productIdFromUrl(productUrl: string) {
  const decoded = decodeURIComponent(productUrl);
  const match = decoded.match(/\/urunno=(\d+)/u);
  if (!match?.[1]) {
    throw new Error("BOOK_INDEX_DR_PRODUCT_ID_MISSING");
  }
  return match[1];
}

function productAnchors(html: string) {
  const matches = [
    ...html.matchAll(
      /<a\b(?=[^>]*\bhref=(["'])([^"']*\/kitap\/[^"']*\/urunno(?:=|%3D)(\d+)[^"']*)\1)[^>]*>/giu,
    ),
  ];

  const firstByProduct = new Map<string, string>();
  for (const match of matches) {
    const productId = match[3]?.trim() ?? "";
    const href = match[2]?.trim() ?? "";
    if (!productId || !href || firstByProduct.has(productId)) continue;
    firstByProduct.set(productId, absoluteUrl(href));
  }

  return [...firstByProduct.values()];
}


type DrListAnchor = {
  index: number;
  href: string;
  productId: string;
};

function listProductAnchors(html: string): DrListAnchor[] {
  const matches = [
    ...html.matchAll(
      /<a\b(?=[^>]*\bhref=(["'])([^"']*\/kitap\/[^"']*\/urunno(?:=|%3D)(\d+)[^"']*)\1)[^>]*>/giu,
    ),
  ];

  const firstByProduct = new Map<string, DrListAnchor>();
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

export function parseDrNewReleases(html: string): BookIndexCollectionResult {
  const pageText = normalizeText(html);
  if (!pageText.includes("Yeni Çıkanlar")) {
    throw new Error("BOOK_INDEX_DR_NEW_RELEASES_MARKER_MISSING");
  }

  const anchors = listProductAnchors(html);
  if (anchors.length !== EXACT_EXPECTED_CANDIDATES) {
    throw new Error(
      `BOOK_INDEX_DR_NEW_RELEASES_UNEXPECTED_PAGE_SIZE:${anchors.length}`,
    );
  }

  const books = anchors.map((anchor, nativeIndex) => {
    const next = anchors[nativeIndex + 1];
    const card = html.slice(anchor.index, next?.index ?? html.length);

    const sameProductTitles = [
      ...card.matchAll(
        new RegExp(
          `<a\\b(?=[^>]*\\bhref=(["'])[^"']*/kitap/[^"']*/urunno(?:=|%3D)${anchor.productId}[^"']*\\1)[^>]*>([\\s\\S]*?)<\\/a>`,
          "giu",
        ),
      ),
    ]
      .map((match) => normalizeText(match[2]))
      .filter(Boolean);

    const imageTag = card.match(/<img\b[^>]*>/iu)?.[0] ?? "";
    const imageAlt = attributeValue(imageTag, "alt");
    const imageSrc = attributeValue(imageTag, "src");
    const title =
      sameProductTitles.sort((left, right) => right.length - left.length)[0]
      || imageAlt;

    const authors = [...new Set(linkedTexts(card, "yazar"))];
    const publishers = [...new Set(linkedTexts(card, "yayinevi"))];

    if (!title || authors.length === 0 || publishers.length !== 1) {
      throw new Error("BOOK_INDEX_DR_NEW_RELEASE_INVALID_ITEM");
    }

    return {
      sourceKey: anchor.productId,
      sourceExternalId: anchor.productId,
      title,
      authorName: authors.join(";"),
      publisherName: publishers[0],
      productUrl: absoluteUrl(anchor.href),
      imageUrl: imageSrc ? absoluteUrl(imageSrc) : null,
      rank: nativeIndex + 1,
      currency: "TRY",
    };
  });

  const sourceKeys = new Set(books.map((book) => book.sourceKey));
  if (sourceKeys.size !== books.length) {
    throw new Error("BOOK_INDEX_DR_NEW_RELEASE_DUPLICATE_SOURCE_KEY");
  }

  if (books.some((book, index) => book.rank !== index + 1)) {
    throw new Error("BOOK_INDEX_DR_NEW_RELEASE_NATIVE_ORDER_MISMATCH");
  }

  return { books };
}

/**
 * Research step 1:
 * Extract candidate product URLs from D&R's native "Çok Satanlar" surface.
 *
 * IMPORTANT: candidate position is deliberately NOT treated as bestseller rank.
 * D&R can hide/unhide products while product detail pages expose an explicit
 * "Haftanın En Çok Satan N.Kitabı" rank badge.
 */
export function parseDrBestsellerCandidateUrls(html: string) {
  const pageText = normalizeText(html);
  if (!pageText.includes("Çok Satanlar")) {
    throw new Error("BOOK_INDEX_DR_BESTSELLER_MARKER_MISSING");
  }

  const candidates = productAnchors(html);
  if (candidates.length !== EXACT_EXPECTED_CANDIDATES) {
    throw new Error(
      `BOOK_INDEX_DR_UNEXPECTED_CANDIDATE_SIZE:${candidates.length}`,
    );
  }

  return candidates;
}

function labeledLinkedText(
  html: string,
  label: "Yazar" | "Yayınevi",
) {
  const match = html.match(
    new RegExp(
      `${label}:\\s*(?:<[^>]+>\\s*)*<a\\b[^>]*>([\\s\\S]*?)<\\/a>`,
      "iu",
    ),
  );
  return normalizeText(match?.[1]);
}

function titleFromDetail(html: string) {
  return normalizeText(
    html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/iu)?.[1],
  );
}

function isbn13FromDetail(html: string) {
  const text = normalizeText(html);
  const match = text.match(/\bBarkod:\s*((?:978|979)\d{10})\b/u);
  return match?.[1] ?? null;
}

function weeklyRankFromDetail(html: string) {
  const text = normalizeText(html);
  const match = text.match(
    /Haftanın En Çok Satan\s+(\d+)\.?\s*Kitabı/iu,
  );

  if (!match?.[1]) {
    throw new Error("BOOK_INDEX_DR_WEEKLY_RANK_BADGE_MISSING");
  }

  const rank = Number.parseInt(match[1], 10);
  if (!Number.isInteger(rank) || rank < 1) {
    throw new Error("BOOK_INDEX_DR_WEEKLY_RANK_INVALID");
  }

  return rank;
}

/**
 * Research step 2:
 * Parse one D&R product detail page and trust only the explicit native
 * "Haftanın En Çok Satan N.Kitabı" badge for rank.
 */
export function parseDrWeeklyRankedProduct(
  html: string,
  productUrl: string,
): BookIndexCollectedBook {
  const canonicalProductUrl = absoluteUrl(productUrl);
  const sourceKey = productIdFromUrl(canonicalProductUrl);
  const rank = weeklyRankFromDetail(html);
  const title = titleFromDetail(html);
  const authorName = labeledLinkedText(html, "Yazar");
  const publisherName = labeledLinkedText(html, "Yayınevi");
  const isbn13 = isbn13FromDetail(html);

  const imageTag = html.match(/<img\b[^>]*>/iu)?.[0] ?? "";
  const imageSrc = attributeValue(imageTag, "src");

  if (!title || !authorName || !publisherName) {
    throw new Error("BOOK_INDEX_DR_INVALID_DETAIL_ITEM");
  }

  return {
    sourceKey,
    sourceExternalId: sourceKey,
    title,
    authorName,
    publisherName,
    isbn13,
    productUrl: canonicalProductUrl,
    imageUrl: imageSrc ? absoluteUrl(imageSrc) : null,
    rank,
    currency: "TRY",
  };
}

export function buildDrWeeklyBestsellerResearchResult(
  products: readonly BookIndexCollectedBook[],
): BookIndexCollectionResult {
  if (products.length === 0) {
    throw new Error("BOOK_INDEX_DR_EMPTY_EXPLICIT_RANK_SET");
  }

  const sourceKeys = new Set(products.map((book) => book.sourceKey));
  const ranks = new Set(products.map((book) => book.rank));

  if (sourceKeys.size !== products.length) {
    throw new Error("BOOK_INDEX_DR_DUPLICATE_SOURCE_KEY");
  }
  if (ranks.size !== products.length) {
    throw new Error("BOOK_INDEX_DR_DUPLICATE_WEEKLY_RANK");
  }

  return {
    books: [...products].sort((left, right) => left.rank - right.rank),
  };
}

export const drBookIndexAdapter: BookIndexSourceAdapter = {
  sourceCode: "dr",
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

    if (context.listCode === "dr-tr-new-releases-research") {
      return parseDrNewReleases(html);
    }

    throw new Error("BOOK_INDEX_DR_LIST_UNSUPPORTED");
  },
};

// Research-only helpers. Deliberately no BookIndexSourceAdapter export here.
// Bestseller catalog position is not accepted as weekly rank.
// New Releases may preserve the native /en-yeniler card order only; no date
// derivation or synthetic recency score is introduced.
// D&R's direct server fetch path remains unverified for production collection.
