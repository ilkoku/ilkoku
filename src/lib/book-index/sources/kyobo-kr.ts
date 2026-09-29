import { gunzipSync } from "node:zlib";

import type {
  BookIndexCollectionContext,
  BookIndexCollectionResult,
  BookIndexSourceAdapter,
} from "../adapter";

const SOURCE_CODE = "kyobo-kr";
const SOURCE_ORIGIN = "https://product.kyobobook.co.kr";
const EXPECTED_BOOKS = 20;

type KyoboBook = {
  rowNum?: number | string | null;
  prstRnkn?: number | string | null;
  frmrRnkn?: number | string | null;
  cmdtName?: string | null;
  chrcName?: string | null;
  pbcmName?: string | null;
  cmdtCode?: string | null;
  saleCmdtid?: string | null;
  imgPath?: string | null;
};

type KyoboPayload = {
  bestSeller?: KyoboBook[];
  page?: number | string | null;
  total?: number | string | null;
  ymw?: string | null;
};

type KyoboResponse = {
  statusCode?: string | number | null;
  resultCode?: string | number | null;
  resultMessage?: string | null;
  detailMessage?: string | null;
  data?: KyoboPayload;
};

function normalizeText(value: unknown) {
  return typeof value === "string"
    ? value.replace(/\s+/gu, " ").trim()
    : "";
}

function normalizeIsbn(value: unknown) {
  const text = normalizeText(value);
  return /^(?:978|979)[0-9]{10}$/u.test(text) ? text : null;
}

function productUrl(saleCmdtid: string) {
  return new URL(`/detail/${saleCmdtid}`, SOURCE_ORIGIN).toString();
}

export function parseKyoboKoreaWeeklyBestsellers(
  payload: KyoboResponse,
): BookIndexCollectionResult {
  const rows = payload.data?.bestSeller;

  if (!Array.isArray(rows) || rows.length !== EXPECTED_BOOKS) {
    throw new Error("BOOK_INDEX_KYOBO_KR_RESPONSE_MISMATCH");
  }

  const books = rows.map((item, index) => {
    const rowNum = Number(item.rowNum);
    const presentRank = Number(item.prstRnkn);
    const title = normalizeText(item.cmdtName);
    const authorName = normalizeText(item.chrcName);
    const publisherName = normalizeText(item.pbcmName);
    const saleCmdtid = normalizeText(item.saleCmdtid);
    const isbn13 = normalizeIsbn(item.cmdtCode);
    const imageUrl = normalizeText(item.imgPath);

    if (
      !Number.isInteger(rowNum)
      || rowNum !== index + 1
      || !Number.isInteger(presentRank)
      || presentRank !== rowNum
      || !title
      || !authorName
      || !publisherName
      || !saleCmdtid
      || !isbn13
    ) {
      throw new Error("BOOK_INDEX_KYOBO_KR_INVALID_ITEM");
    }

    return {
      sourceKey: saleCmdtid,
      sourceExternalId: saleCmdtid,
      title,
      authorName,
      publisherName,
      isbn13,
      productUrl: productUrl(saleCmdtid),
      imageUrl: imageUrl || null,
      rank: rowNum,
      currency: "KRW",
    };
  });

  const sourceKeys = new Set(books.map((book) => book.sourceKey));
  if (sourceKeys.size !== books.length) {
    throw new Error("BOOK_INDEX_KYOBO_KR_DUPLICATE_PRODUCT");
  }

  const isbns = new Set(books.map((book) => book.isbn13));
  if (isbns.size !== books.length) {
    throw new Error("BOOK_INDEX_KYOBO_KR_DUPLICATE_ISBN");
  }

  return { books };
}

function decodeKyoboBody(bytes: Uint8Array) {
  const decoded =
    bytes[0] === 0x1f && bytes[1] === 0x8b
      ? gunzipSync(bytes)
      : bytes;

  return new TextDecoder("utf-8", { fatal: true }).decode(decoded);
}

async function fetchJson(url: string): Promise<KyoboResponse> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json,text/plain,*/*",
      "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.7",
      Referer:
        "https://store.kyobobook.co.kr/bestseller/online/weekly/domestic?page=1&pcMode=on",
      "User-Agent": "IlkOkuBookIndex/0.1 (+https://ilkoku.com)",
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`BOOK_INDEX_SOURCE_HTTP_${response.status}`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());

  try {
    return JSON.parse(decodeKyoboBody(bytes)) as KyoboResponse;
  } catch {
    throw new Error("BOOK_INDEX_KYOBO_KR_INVALID_JSON");
  }
}

export const kyoboKoreaBookIndexAdapter: BookIndexSourceAdapter = {
  sourceCode: SOURCE_CODE,
  async collect(
    context: BookIndexCollectionContext,
  ): Promise<BookIndexCollectionResult> {
    if (context.listCode !== "kyobo-kr-weekly") {
      throw new Error("BOOK_INDEX_KYOBO_KR_LIST_NOT_SUPPORTED");
    }

    return parseKyoboKoreaWeeklyBestsellers(
      await fetchJson(context.sourceUrl),
    );
  },
};
