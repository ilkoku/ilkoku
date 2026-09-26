import type {
  BookIndexCollectionContext,
  BookIndexCollectionResult,
  BookIndexSourceAdapter,
} from "../adapter";
import { decodeBookIndexHtml } from "../html";

const SOURCE_CODE = "kitaplarsepette";
const SOURCE_ORIGIN = "https://www.kitaplarsepette.com";
const MAX_BOOKS = 30;
const MIN_EXPECTED_BOOKS = 25;
const DETAIL_CONCURRENCY = 6;

type KitaplarSepetteCard = {
  productId: string;
  title: string;
  productUrl: string;
  imageUrl: string | null;
  rank: number;
};

type KitaplarSepetteDetail = {
  isbn13: string | null;
  authorName: string | null;
  publisherName: string | null;
};

function absoluteUrl(value: string) {
  return new URL(value, SOURCE_ORIGIN).toString();
}

function validIsbn13(value: string | undefined) {
  const normalized = (value ?? "").replace(/[^0-9]/gu, "");
  return /^(?:978|979)[0-9]{10}$/u.test(normalized) ? normalized : null;
}

export function parseKitaplarSepetteBestsellerCards(
  html: string,
): KitaplarSepetteCard[] {
  const starts = [...html.matchAll(/<div\b[^>]*>/giu)].filter((match) => {
    const className = match[0].match(/\bclass=["']([^"']*)["']/iu)?.[1] ?? "";
    return className.split(/\s+/u).includes("card-product");
  });

  const cards = starts
    .map((match, index) => {
      const start = match.index ?? 0;
      const end = starts[index + 1]?.index ?? html.length;
      const card = html.slice(start, end);

      const productId = card.match(
        /\baddCart\(\s*([0-9]+)\s*,\s*["']card["']\s*\)/iu,
      )?.[1];
      const link = card.match(
        /<a\b(?=[^>]*\bclass=["'][^"']*\bc-p-i-link\b[^"']*["'])(?=[^>]*\bhref=["']([^"']+)["'])(?=[^>]*\btitle=["']([^"']+)["'])[^>]*>/iu,
      );
      const image = card.match(
        /<img\b[^>]*\bclass=["'][^"']*\bimg-auto\b[^"']*["'][^>]*\bdata-src=["']([^"']+)["'][^>]*>/iu,
      )?.[1];

      if (!productId || !link?.[1] || !link?.[2]) return null;

      const title = decodeBookIndexHtml(link[2]);
      if (!title) return null;

      return {
        productId,
        title,
        productUrl: absoluteUrl(link[1]),
        imageUrl: image ? absoluteUrl(image) : null,
        rank: index + 1,
      };
    })
    .filter((card): card is KitaplarSepetteCard => card !== null)
    .slice(0, MAX_BOOKS);

  if (cards.length < MIN_EXPECTED_BOOKS) {
    throw new Error("BOOK_INDEX_KITAPLARSEPETTE_RESULT_TOO_SMALL");
  }

  const uniqueIds = new Set(cards.map((card) => card.productId));
  if (uniqueIds.size !== cards.length) {
    throw new Error("BOOK_INDEX_KITAPLARSEPETTE_DUPLICATE_PRODUCT_ID");
  }

  const uniqueUrls = new Set(cards.map((card) => card.productUrl));
  if (uniqueUrls.size !== cards.length) {
    throw new Error("BOOK_INDEX_KITAPLARSEPETTE_DUPLICATE_PRODUCT_URL");
  }

  return cards;
}

function detailLabelValue(
  html: string,
  label: "Yazar" | "Yayınevi",
) {
  const anchorValue = html.match(
    new RegExp(`\\b${label}\\s*:\\s*<a\\b[^>]*>([\\s\\S]*?)<\\/a>`, "iu"),
  )?.[1];

  if (anchorValue) return decodeBookIndexHtml(anchorValue);

  const plainValue = html.match(
    new RegExp(
      `\\b${label}\\s*:\\s*(?:<[^>]+>\\s*)*([^<\\r\\n][^<\\r\\n]*)`,
      "iu",
    ),
  )?.[1];

  return plainValue ? decodeBookIndexHtml(plainValue) : null;
}

export function parseKitaplarSepetteProductDetails(
  html: string,
): KitaplarSepetteDetail {
  const barcode = html.match(
    /\bBarkod\s*:\s*(?:<[^>]+>\s*)*((?:978|979)[0-9\s-]{10,20})/iu,
  )?.[1];

  return {
    isbn13: validIsbn13(barcode),
    authorName: detailLabelValue(html, "Yazar"),
    publisherName: detailLabelValue(html, "Yayınevi"),
  };
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
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

  return response.text();
}

async function enrichCards(cards: KitaplarSepetteCard[]) {
  const details = new Array<KitaplarSepetteDetail>(cards.length);
  let nextIndex = 0;

  const workers = Array.from(
    { length: Math.min(DETAIL_CONCURRENCY, cards.length) },
    async () => {
      while (true) {
        const index = nextIndex;
        nextIndex += 1;
        if (index >= cards.length) return;

        details[index] = parseKitaplarSepetteProductDetails(
          await fetchHtml(cards[index].productUrl),
        );
      }
    },
  );

  await Promise.all(workers);
  return details;
}

export const kitaplarSepetteBookIndexAdapter: BookIndexSourceAdapter = {
  sourceCode: SOURCE_CODE,
  async collect(
    context: BookIndexCollectionContext,
  ): Promise<BookIndexCollectionResult> {
    const cards = parseKitaplarSepetteBestsellerCards(
      await fetchHtml(context.sourceUrl),
    );
    const details = await enrichCards(cards);

    const books = cards.map((card, index) => {
      const detail = details[index];

      if (!detail?.isbn13 && !detail?.authorName) {
        throw new Error("BOOK_INDEX_KITAPLARSEPETTE_DETAIL_METADATA_MISSING");
      }

      return {
        sourceKey: detail.isbn13 || card.productId,
        sourceExternalId: card.productId,
        title: card.title,
        authorName: detail.authorName,
        publisherName: detail.publisherName,
        isbn13: detail.isbn13,
        productUrl: card.productUrl,
        imageUrl: card.imageUrl,
        rank: card.rank,
        currency: "TRY",
      };
    });

    return { books };
  },
};
