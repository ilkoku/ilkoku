import type {
  BookIndexCollectionContext,
  BookIndexCollectionResult,
  BookIndexSourceAdapter,
} from "../adapter";
import { decodeBookIndexHtml } from "../html";

const SOURCE_CODE = "kitapyurdu";
const SOURCE_ORIGIN = "https://www.kitapyurdu.com";
const WEEKLY_GENERAL_PATH = "/cok-satan-kitaplar/haftalik/1.html";
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

function weeklyGeneralUrl(sourceUrl: string) {
  const url = new URL(sourceUrl);

  if (url.origin !== SOURCE_ORIGIN || url.pathname !== WEEKLY_GENERAL_PATH) {
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
  body: string;
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
      body: match[4] ?? "",
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

export function parseKitapyurduWeeklyBestsellers(
  html: string,
): BookIndexCollectionResult {
  const pageText = normalizeText(html);
  if (
    !pageText.includes("Çok Satanlar (Genel, Haftalık)")
    || !pageText.includes("Son 7 gün içerisinde en çok satın alınan ürünler")
  ) {
    throw new Error("BOOK_INDEX_KITAPYURDU_WEEKLY_GENERAL_MARKER_MISSING");
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

async function fetchHtml(sourceUrl: string) {
  const response = await fetch(weeklyGeneralUrl(sourceUrl), {
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

// Research-only adapter. Deliberately not registered in collector.ts.
// Source state, list activation and production rollout remain separate decisions.
export const kitapyurduBookIndexResearchAdapter: BookIndexSourceAdapter = {
  sourceCode: SOURCE_CODE,
  async collect(
    context: BookIndexCollectionContext,
  ): Promise<BookIndexCollectionResult> {
    if (context.listCode !== "kitapyurdu-tr-weekly-research") {
      throw new Error("BOOK_INDEX_KITAPYURDU_LIST_NOT_SUPPORTED");
    }

    return parseKitapyurduWeeklyBestsellers(await fetchHtml(context.sourceUrl));
  },
};
