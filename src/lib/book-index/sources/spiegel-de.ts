import type {
  BookIndexCollectionContext,
  BookIndexCollectionResult,
  BookIndexSourceAdapter,
} from "../adapter";
import { decodeBookIndexHtml } from "../html";

const SOURCE_CODE = "spiegel-de";
const SOURCE_ORIGIN = "https://shop.spiegel.de";
const EXPECTED_BOOKS = 20;

function absoluteUrl(value: string) {
  return new URL(value, SOURCE_ORIGIN).toString();
}

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

export function parseSpiegelGermanyFictionHardcoverBestsellers(
  html: string,
): BookIndexCollectionResult {
  const starts = [
    ...html.matchAll(
      /<article\b[^>]*class=["'][^"']*\bproduct-box\b[^"']*["'][^>]*>/giu,
    ),
  ];

  const books = [];

  for (let index = 0; index < starts.length; index += 1) {
    const match = starts[index];
    const start = match.index ?? 0;
    const end = starts[index + 1]?.index ?? html.length;
    const card = html.slice(start, end);

    const rankValue = card.match(
      /<div\b[^>]*class=["'][^"']*\bproduct-box__top-seller-number\b[^"']*["'][^>]*>\s*#([1-9]|1[0-9]|20)\s*<\/div>/iu,
    )?.[1];
    if (!rankValue) continue;

    const linkTag = card.match(
      /<a\b[^>]*class=["'][^"']*\bproduct-box__full-link\b[^"']*["'][^>]*>/iu,
    )?.[0];
    const href = linkTag ? attributeValue(linkTag, "href") : "";
    const productUrl = href ? absoluteUrl(href) : "";
    const sourceExternalId = productUrl.match(/\/(a[0-9]{8})(?:[/?#]|$)/u)?.[1] ?? "";

    const titleHtml = card.match(
      /<div\b[^>]*class=["'][^"']*\bproduct-box__name\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/iu,
    )?.[1];
    const authorHtml = card.match(
      /<div\b[^>]*class=["'][^"']*\bproduct-box__manufacturer\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/iu,
    )?.[1];
    const imageTag = card.match(/<img\b[^>]*>/iu)?.[0];

    const rank = Number(rankValue);
    const title = normalizeText(titleHtml);
    const authorName = normalizeText(authorHtml);
    const imageUrl = imageTag ? attributeValue(imageTag, "src") : "";

    if (
      !Number.isInteger(rank)
      || rank < 1
      || rank > EXPECTED_BOOKS
      || !sourceExternalId
      || !productUrl
      || !title
      || !authorName
    ) {
      throw new Error("BOOK_INDEX_SPIEGEL_DE_INVALID_ITEM");
    }

    books.push({
      sourceKey: sourceExternalId,
      sourceExternalId,
      title,
      authorName,
      publisherName: null,
      productUrl,
      imageUrl: imageUrl ? absoluteUrl(imageUrl) : null,
      rank,
      currency: "EUR",
    });
  }

  books.sort((left, right) => left.rank - right.rank);

  if (books.length !== EXPECTED_BOOKS) {
    throw new Error(
      `BOOK_INDEX_SPIEGEL_DE_RESULT_SIZE_MISMATCH:${books.length}`,
    );
  }

  if (books.some((book, index) => book.rank !== index + 1)) {
    throw new Error("BOOK_INDEX_SPIEGEL_DE_RANK_ORDER_MISMATCH");
  }

  const sourceKeys = new Set(books.map((book) => book.sourceKey));
  if (sourceKeys.size !== books.length) {
    throw new Error("BOOK_INDEX_SPIEGEL_DE_DUPLICATE_PRODUCT");
  }

  return { books };
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "de-DE,de;q=0.9,en;q=0.6",
      "User-Agent": "IlkOkuBookIndex/0.1 (+https://ilkoku.com)",
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`BOOK_INDEX_SOURCE_HTTP_${response.status}`);
  }

  return response.text();
}

export const spiegelGermanyBookIndexAdapter: BookIndexSourceAdapter = {
  sourceCode: SOURCE_CODE,
  async collect(
    context: BookIndexCollectionContext,
  ): Promise<BookIndexCollectionResult> {
    if (context.listCode !== "spiegel-de-fiction-hardcover-weekly") {
      throw new Error("BOOK_INDEX_SPIEGEL_DE_LIST_NOT_SUPPORTED");
    }

    return parseSpiegelGermanyFictionHardcoverBestsellers(
      await fetchHtml(context.sourceUrl),
    );
  },
};
