import type {
  BookIndexCollectionContext,
  BookIndexCollectionResult,
  BookIndexSourceAdapter,
} from "../adapter";
import { decodeBookIndexHtml } from "../html";

const SOURCE_CODE = "amazon-uk";
const SOURCE_ORIGIN = "https://www.amazon.co.uk";
const EXPECTED_BOOKS = 30;

function attributeValue(fragment: string, name: string) {
  const match = fragment.match(
    new RegExp(`\\b${name}=(["'])([\\s\\S]*?)\\1`, "iu"),
  );
  return match?.[2] ? decodeBookIndexHtml(match[2]) : "";
}

function normalizedText(fragment: string | undefined) {
  return decodeBookIndexHtml(fragment ?? "")
    .replace(/<[^>]+>/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function canonicalProductUrl(asin: string) {
  return new URL(`/dp/${asin}`, SOURCE_ORIGIN).toString();
}

export function parseAmazonUkBestsellerPage(
  html: string,
): BookIndexCollectionResult {
  if (/automated access|captcha/iu.test(html)) {
    throw new Error("BOOK_INDEX_AMAZON_UK_ACCESS_CHALLENGE");
  }

  const starts = [
    ...html.matchAll(
      /<div\b(?=[^>]*\bid=["']p13n-asin-index-(\d+)["'])[^>]*>/giu,
    ),
  ];

  if (starts.length !== EXPECTED_BOOKS) {
    throw new Error(
      `BOOK_INDEX_AMAZON_UK_RESULT_SIZE_MISMATCH:${starts.length}`,
    );
  }

  const books = starts.map((match, index) => {
    const cardIndex = Number(match[1]);
    const start = match.index ?? 0;
    const end = starts[index + 1]?.index ?? html.length;
    const card = html.slice(start, end);

    const asin = card.match(
      /\bdata-asin=["']([A-Z0-9]{10})["']/iu,
    )?.[1];

    const rankValue = card.match(
      /<span\b[^>]*class=["'][^"']*\bzg-bdg-text\b[^"']*["'][^>]*>\s*#(\d{1,3})\s*<\/span>/iu,
    )?.[1];
    const rank = rankValue ? Number(rankValue) : Number.NaN;

    const imageTag = card.match(
      /<img\b[^>]*class=["'][^"']*\bp13n-product-image\b[^"']*["'][^>]*>/iu,
    )?.[0];

    const title = imageTag ? attributeValue(imageTag, "alt") : "";
    const imageUrl = imageTag ? attributeValue(imageTag, "src") : "";
    const authorHtml = card.match(
      /<a\b[^>]*class=["'][^"']*(?:\ba-size-small\b[^"']*\ba-link-child\b|\ba-link-child\b[^"']*\ba-size-small\b)[^"']*["'][^>]*>([\s\S]*?)<\/a>/iu,
    )?.[1];
    const authorFallbackHtml = card.match(
      /<div\b[^>]*class=["'][^"']*\ba-row\b[^"']*\ba-size-small\b[^"']*["'][^>]*>[\s\S]*?<span\b[^>]*class=["'][^"']*\ba-size-small\b[^"']*\ba-color-base\b[^"']*["'][^>]*>[\s\S]*?<div\b[^>]*>([\s\S]*?)<\/div>[\s\S]*?<\/span>/iu,
    )?.[1];
    const authorName =
      normalizedText(authorHtml) || normalizedText(authorFallbackHtml);

    if (
      cardIndex !== index
      || !asin
      || !Number.isInteger(rank)
      || rank !== index + 1
      || !title
    ) {
      throw new Error("BOOK_INDEX_AMAZON_UK_INVALID_ITEM");
    }

    return {
      sourceKey: asin,
      sourceExternalId: asin,
      title,
      authorName: authorName || null,
      publisherName: null,
      productUrl: canonicalProductUrl(asin),
      imageUrl: imageUrl || null,
      rank,
      currency: "GBP",
    };
  });

  const sourceKeys = new Set(books.map((book) => book.sourceKey));
  if (sourceKeys.size !== books.length) {
    throw new Error("BOOK_INDEX_AMAZON_UK_DUPLICATE_ASIN");
  }

  if (books.some((book, index) => book.rank !== index + 1)) {
    throw new Error("BOOK_INDEX_AMAZON_UK_RANK_ORDER_MISMATCH");
  }

  return { books };
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-GB,en;q=0.9",
      "User-Agent": "IlkOkuBookIndex/0.1 (+https://ilkoku.com)",
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`BOOK_INDEX_SOURCE_HTTP_${response.status}`);
  }

  return response.text();
}

export const amazonUkBookIndexAdapter: BookIndexSourceAdapter = {
  sourceCode: SOURCE_CODE,
  async collect(
    context: BookIndexCollectionContext,
  ): Promise<BookIndexCollectionResult> {
    if (context.listCode !== "amazon-uk-live") {
      throw new Error("BOOK_INDEX_AMAZON_UK_LIST_NOT_SUPPORTED");
    }

    return parseAmazonUkBestsellerPage(
      await fetchHtml(context.sourceUrl),
    );
  },
};
