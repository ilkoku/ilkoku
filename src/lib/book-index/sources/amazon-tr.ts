import type {
  BookIndexCollectionContext,
  BookIndexCollectionResult,
  BookIndexSourceAdapter,
} from "../adapter";
import { decodeBookIndexHtml } from "../html";

const SOURCE_CODE = "amazon-tr";
const SOURCE_ORIGIN = "https://www.amazon.com.tr";
const BESTSELLER_PATH = "/gp/bestsellers/books";
const NEW_RELEASES_PATH = "/gp/new-releases/books";
const BESTSELLER_PAGE_TWO_URL =
  "https://www.amazon.com.tr/gp/bestsellers/books/ref=zg_bs_pg_2_books?ie=UTF8&pg=2";
const NEW_RELEASES_PAGE_TWO_URL =
  "https://www.amazon.com.tr/gp/new-releases/books/ref=zg_bsnr_pg_2_books?ie=UTF8&pg=2";
const MIN_EXPECTED_PAGE_BOOKS = 25;

function attributeValue(fragment: string, name: string) {
  const match = fragment.match(
    new RegExp(`\\b${name}=["']([^"']+)["']`, "iu"),
  );
  return match?.[1] ? decodeBookIndexHtml(match[1]) : "";
}

function priceToMinorUnits(value: string | undefined) {
  const decoded = decodeBookIndexHtml(value ?? "")
    .replace(/\u00a0/gu, " ")
    .replace(/\s*TL\s*$/iu, "")
    .replace(/\./gu, "")
    .replace(/,/gu, ".")
    .trim();

  if (!/^\d+(?:\.\d{1,2})?$/u.test(decoded)) return null;

  const amount = Number(decoded);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return BigInt(Math.round(amount * 100));
}

function canonicalProductUrl(asin: string) {
  return new URL(`/dp/${asin}`, SOURCE_ORIGIN).toString();
}

function parseCard(card: string, asin: string) {
  const rankValue = card.match(
    /<span\b[^>]*class=["'][^"']*\bzg-bdg-text\b[^"']*["'][^>]*>\s*#(\d{1,3})\s*<\/span>/iu,
  )?.[1];
  const rank = rankValue ? Number(rankValue) : Number.NaN;

  const productHref = card.match(
    new RegExp(
      `<a\\b(?=[^>]*\\bhref=["']([^"']*\\/dp\\/${asin}(?:\\/[^"']*)?)["'])[^>]*>`,
      "iu",
    ),
  )?.[1];

  const imageTag = card.match(
    /<img\b[^>]*\bclass=["'][^"']*\bp13n-product-image\b[^"']*["'][^>]*>/iu,
  )?.[0];

  const title = imageTag ? attributeValue(imageTag, "alt") : "";
  const imageUrl = imageTag ? attributeValue(imageTag, "src") : "";

  const author = card.match(
    /<div\b[^>]*class=["'][^"']*\ba-row\b[^"']*\ba-size-small\b[^"']*["'][^>]*>[\s\S]*?<span\b[^>]*class=["'][^"']*\ba-size-small\b[^"']*\ba-color-base\b[^"']*["'][^>]*>[\s\S]*?<div\b[^>]*>([\s\S]*?)<\/div>[\s\S]*?<\/span>/iu,
  )?.[1];

  const price = card.match(
    /<span\b[^>]*class=["'][^"']*\ba-color-price\b[^"']*["'][^>]*>[\s\S]*?<span\b[^>]*>([^<]*TL)\s*<\/span>/iu,
  )?.[1];

  if (
    !Number.isInteger(rank)
    || rank < 1
    || !productHref
    || !title
  ) {
    throw new Error("BOOK_INDEX_AMAZON_TR_INVALID_ITEM");
  }

  return {
    sourceKey: asin,
    sourceExternalId: asin,
    title,
    authorName: author ? decodeBookIndexHtml(author) : null,
    publisherName: null,
    productUrl: canonicalProductUrl(asin),
    imageUrl: imageUrl || null,
    rank,
    priceAmount: priceToMinorUnits(price),
    currency: "TRY",
  };
}

export function parseAmazonTrRankedBookPage(
  html: string,
): BookIndexCollectionResult {
  const starts = [
    ...html.matchAll(
      /<div\b(?=[^>]*\bdata-asin=["']([^"']+)["'])[^>]*>/giu,
    ),
  ].filter((match) => Boolean(match[1]?.trim()));

  const books = starts.map((match, index) => {
    const asin = match[1].trim();
    const start = match.index ?? 0;
    const end = starts[index + 1]?.index ?? html.length;
    return parseCard(html.slice(start, end), asin);
  });

  if (books.length < MIN_EXPECTED_PAGE_BOOKS) {
    throw new Error("BOOK_INDEX_AMAZON_TR_RESULT_TOO_SMALL");
  }

  const sourceKeys = new Set(books.map((book) => book.sourceKey));
  if (sourceKeys.size !== books.length) {
    throw new Error("BOOK_INDEX_AMAZON_TR_DUPLICATE_SOURCE_KEY");
  }

  const ranks = books.map((book) => book.rank);
  if (
    new Set(ranks).size !== ranks.length
    || ranks.some((rank, index) => index > 0 && rank !== ranks[index - 1] + 1)
  ) {
    throw new Error("BOOK_INDEX_AMAZON_TR_PAGE_RANK_GAP");
  }

  return { books };
}

export function parseAmazonTrBestsellerPage(
  html: string,
): BookIndexCollectionResult {
  return parseAmazonTrRankedBookPage(html);
}

export function parseAmazonTrNewReleasePage(
  html: string,
): BookIndexCollectionResult {
  return parseAmazonTrRankedBookPage(html);
}

export function combineAmazonTrRankedBookPages(
  pages: BookIndexCollectionResult[],
): BookIndexCollectionResult {
  const books = pages.flatMap((page) => page.books).sort(
    (left, right) => left.rank - right.rank,
  );

  if (books.length === 0 || books[0]?.rank !== 1) {
    throw new Error("BOOK_INDEX_AMAZON_TR_RANK_GAP");
  }

  const sourceKeys = new Set(books.map((book) => book.sourceKey));
  const ranks = new Set(books.map((book) => book.rank));

  if (sourceKeys.size !== books.length) {
    throw new Error("BOOK_INDEX_AMAZON_TR_DUPLICATE_SOURCE_KEY");
  }

  if (ranks.size !== books.length) {
    throw new Error("BOOK_INDEX_AMAZON_TR_DUPLICATE_RANK");
  }

  if (books.some((book, index) => book.rank !== index + 1)) {
    throw new Error("BOOK_INDEX_AMAZON_TR_RANK_GAP");
  }

  return { books };
}

export function combineAmazonTrBestsellerPages(
  pages: BookIndexCollectionResult[],
): BookIndexCollectionResult {
  return combineAmazonTrRankedBookPages(pages);
}

function verifiedSourceUrl(sourceUrl: string, expectedPath: string) {
  const url = new URL(sourceUrl);

  if (url.origin !== SOURCE_ORIGIN || url.pathname !== expectedPath) {
    throw new Error("BOOK_INDEX_AMAZON_TR_SOURCE_URL_MISMATCH");
  }

  url.search = "";
  url.hash = "";
  return url.toString();
}

type ResearchListConfig = {
  firstPageUrl: string;
  secondPageUrl: string;
};

function researchListConfig(context: BookIndexCollectionContext): ResearchListConfig {
  if (context.listCode === "amazon-tr-bestsellers-research") {
    return {
      firstPageUrl: verifiedSourceUrl(context.sourceUrl, BESTSELLER_PATH),
      secondPageUrl: BESTSELLER_PAGE_TWO_URL,
    };
  }

  if (context.listCode === "amazon-tr-new-releases-research") {
    return {
      firstPageUrl: verifiedSourceUrl(context.sourceUrl, NEW_RELEASES_PATH),
      secondPageUrl: NEW_RELEASES_PAGE_TWO_URL,
    };
  }

  throw new Error("BOOK_INDEX_AMAZON_TR_LIST_NOT_SUPPORTED");
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

// Research-only adapter. Deliberately not registered in collector.ts.
// Opera verified both native book-ranked surfaces:
// - /gp/bestsellers/books
// - /gp/new-releases/books
// Production collection remains separate from surface/parser verification.
export const amazonTrBookIndexResearchAdapter: BookIndexSourceAdapter = {
  sourceCode: SOURCE_CODE,
  async collect(
    context: BookIndexCollectionContext,
  ): Promise<BookIndexCollectionResult> {
    const config = researchListConfig(context);
    const [firstPage, secondPage] = await Promise.all([
      fetchHtml(config.firstPageUrl),
      fetchHtml(config.secondPageUrl),
    ]);

    return combineAmazonTrRankedBookPages([
      parseAmazonTrRankedBookPage(firstPage),
      parseAmazonTrRankedBookPage(secondPage),
    ]);
  },
};
