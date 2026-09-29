import type {
  BookIndexCollectedBook,
  BookIndexCollectionResult,
} from "../adapter";
import { decodeBookIndexHtml } from "../html";

const SOURCE_ORIGIN = "https://www.dr.com.tr";
const BESTSELLER_PATH = "/kategori_/kitap/cok-satanlar/10001/12";
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

// Research-only helpers. Deliberately no BookIndexSourceAdapter export here.
// The catalog position is not accepted as rank, and D&R's direct server fetch
// path remains unverified for production collection.
