import "server-only";

import { prisma } from "@/lib/prisma";

import { parseIdefixProductDetails } from "./sources/idefix";

const SOURCE_CODE = "idefix";
const MAX_CANDIDATES = 100;
const DETAIL_CONCURRENCY = 6;
const SAMPLE_LIMIT = 30;

type Candidate = {
  sourceKey: string;
  title: string;
  authorName: string | null;
  isbn13: string | null;
  isbn10: string | null;
  productUrl: string;
  firstSeenAt: Date;
  lastSeenAt: Date;
};

type DetailResult =
  | {
      ok: true;
      authorName: string | null;
      isbn13: string | null;
    }
  | {
      ok: false;
      error: string;
    };

function safeError(error: unknown) {
  if (error instanceof Error) return error.message.slice(0, 180);
  return "BOOK_INDEX_IDEFIX_HISTORY_PROBE_UNKNOWN_ERROR";
}

async function fetchDetail(candidate: Candidate): Promise<DetailResult> {
  try {
    const response = await fetch(candidate.productUrl, {
      cache: "no-store",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "IlkOkuBookIndex/0.1 (+https://ilkoku.com)",
      },
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      return {
        ok: false,
        error: `BOOK_INDEX_SOURCE_HTTP_${response.status}`,
      };
    }

    const detail = parseIdefixProductDetails(
      await response.text(),
      candidate.title,
    );

    return {
      ok: true,
      authorName: detail.authorName,
      isbn13: detail.isbn13,
    };
  } catch (error) {
    return {
      ok: false,
      error: safeError(error),
    };
  }
}

export async function probeIdefixHistoricalMetadata(limit = MAX_CANDIDATES) {
  const safeLimit = Math.min(
    Math.max(Math.trunc(limit), 1),
    MAX_CANDIDATES,
  );

  const source = await prisma.bookIndexSource.findUnique({
    where: { code: SOURCE_CODE },
    select: { id: true },
  });

  if (!source) {
    throw new Error("BOOK_INDEX_IDEFIX_SOURCE_NOT_FOUND");
  }

  const candidates = await prisma.bookIndexExternalBook.findMany({
    where: {
      sourceId: source.id,
      matchStatus: "unmatched",
      masterBookId: null,
    },
    orderBy: [
      { firstSeenAt: "asc" },
      { sourceKey: "asc" },
    ],
    take: safeLimit,
    select: {
      sourceKey: true,
      title: true,
      authorName: true,
      isbn13: true,
      isbn10: true,
      productUrl: true,
      firstSeenAt: true,
      lastSeenAt: true,
    },
  });

  const results = new Array<DetailResult>(candidates.length);
  let nextIndex = 0;

  const workers = Array.from(
    { length: Math.min(DETAIL_CONCURRENCY, candidates.length) },
    async () => {
      while (true) {
        const index = nextIndex;
        nextIndex += 1;

        if (index >= candidates.length) return;
        results[index] = await fetchDetail(candidates[index]);
      }
    },
  );

  await Promise.all(workers);

  let fetchSuccessCount = 0;
  let fetchErrorCount = 0;
  let recoverableAuthorCount = 0;
  let recoverableIsbn13Count = 0;
  let recoverableIdentityCount = 0;
  let stillIdentityPoorCount = 0;

  const recoverableSamples: Array<{
    sourceKey: string;
    title: string;
    recoveredAuthorName: string | null;
    recoveredIsbn13: string | null;
    firstSeenAt: Date;
    lastSeenAt: Date;
  }> = [];
  const unresolvedSamples: Array<{
    sourceKey: string;
    title: string;
    error: string | null;
    firstSeenAt: Date;
    lastSeenAt: Date;
  }> = [];

  candidates.forEach((candidate, index) => {
    const result = results[index];

    if (!result?.ok) {
      fetchErrorCount += 1;
      unresolvedSamples.push({
        sourceKey: candidate.sourceKey,
        title: candidate.title,
        error: result?.error ?? "BOOK_INDEX_IDEFIX_HISTORY_PROBE_NO_RESULT",
        firstSeenAt: candidate.firstSeenAt,
        lastSeenAt: candidate.lastSeenAt,
      });
      return;
    }

    fetchSuccessCount += 1;

    const recoveredAuthorName = candidate.authorName
      ? null
      : result.authorName;
    const recoveredIsbn13 = candidate.isbn13
      ? null
      : result.isbn13;

    if (recoveredAuthorName) recoverableAuthorCount += 1;
    if (recoveredIsbn13) recoverableIsbn13Count += 1;

    const hasIdentityAfter =
      Boolean(candidate.authorName || recoveredAuthorName)
      || Boolean(candidate.isbn13 || recoveredIsbn13)
      || Boolean(candidate.isbn10);

    const gainsIdentity =
      !candidate.authorName
      && !candidate.isbn13
      && !candidate.isbn10
      && Boolean(recoveredAuthorName || recoveredIsbn13);

    if (gainsIdentity) recoverableIdentityCount += 1;

    if (recoveredAuthorName || recoveredIsbn13) {
      recoverableSamples.push({
        sourceKey: candidate.sourceKey,
        title: candidate.title,
        recoveredAuthorName,
        recoveredIsbn13,
        firstSeenAt: candidate.firstSeenAt,
        lastSeenAt: candidate.lastSeenAt,
      });
    }

    if (!hasIdentityAfter) {
      stillIdentityPoorCount += 1;
      unresolvedSamples.push({
        sourceKey: candidate.sourceKey,
        title: candidate.title,
        error: null,
        firstSeenAt: candidate.firstSeenAt,
        lastSeenAt: candidate.lastSeenAt,
      });
    }
  });

  return {
    sourceCode: SOURCE_CODE,
    mode: "read_only",
    candidateLimit: safeLimit,
    candidateCount: candidates.length,
    fetchSuccessCount,
    fetchErrorCount,
    recoverableAuthorCount,
    recoverableIsbn13Count,
    recoverableIdentityCount,
    stillIdentityPoorCount,
    recoverableSamples: recoverableSamples.slice(0, SAMPLE_LIMIT),
    unresolvedSamples: unresolvedSamples.slice(0, SAMPLE_LIMIT),
  };
}
