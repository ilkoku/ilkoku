import "server-only";

import { prisma } from "@/lib/prisma";
import { fetchIdefixProductDetails } from "./sources/idefix";

const MAX_LIMIT = 100;
const DETAIL_CONCURRENCY = 6;

type Candidate = {
  id: string;
  sourceKey: string;
  title: string;
  authorName: string | null;
  isbn13: string | null;
  isbn10: string | null;
  productUrl: string;
  firstSeenAt: Date;
  lastSeenAt: Date;
};

type ProbeResult = {
  sourceKey: string;
  title: string;
  productUrl: string;
  firstSeenAt: Date;
  lastSeenAt: Date;
  currentAuthorName: string | null;
  currentIsbn13: string | null;
  recoveredAuthorName: string | null;
  recoveredIsbn13: string | null;
  error: string | null;
};

function safeError(error: unknown) {
  return error instanceof Error
    ? error.message.slice(0, 180)
    : "BOOK_INDEX_IDEFIX_BACKFILL_UNKNOWN_ERROR";
}

export async function getIdefixHistoricalBackfillDryRun(limit = MAX_LIMIT) {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), MAX_LIMIT);
  const source = await prisma.bookIndexSource.findUnique({
    where: { code: "idefix" },
    select: { id: true },
  });

  if (!source) {
    throw new Error("BOOK_INDEX_IDEFIX_SOURCE_NOT_FOUND");
  }

  const candidates: Candidate[] = await prisma.bookIndexExternalBook.findMany({
    where: {
      sourceId: source.id,
      matchStatus: "unmatched",
      masterBookId: null,
    },
    orderBy: [
      { lastSeenAt: "asc" },
      { sourceKey: "asc" },
    ],
    take: safeLimit,
    select: {
      id: true,
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

  const results = new Array<ProbeResult>(candidates.length);
  let nextIndex = 0;

  const workers = Array.from(
    { length: Math.min(DETAIL_CONCURRENCY, candidates.length) },
    async () => {
      while (true) {
        const index = nextIndex;
        nextIndex += 1;
        if (index >= candidates.length) return;

        const candidate = candidates[index];

        try {
          const detail = await fetchIdefixProductDetails(
            candidate.productUrl,
            candidate.title,
          );

          results[index] = {
            sourceKey: candidate.sourceKey,
            title: candidate.title,
            productUrl: candidate.productUrl,
            firstSeenAt: candidate.firstSeenAt,
            lastSeenAt: candidate.lastSeenAt,
            currentAuthorName: candidate.authorName,
            currentIsbn13: candidate.isbn13,
            recoveredAuthorName:
              candidate.authorName ? null : detail.authorName,
            recoveredIsbn13:
              candidate.isbn13 ? null : detail.isbn13,
            error: null,
          };
        } catch (error) {
          results[index] = {
            sourceKey: candidate.sourceKey,
            title: candidate.title,
            productUrl: candidate.productUrl,
            firstSeenAt: candidate.firstSeenAt,
            lastSeenAt: candidate.lastSeenAt,
            currentAuthorName: candidate.authorName,
            currentIsbn13: candidate.isbn13,
            recoveredAuthorName: null,
            recoveredIsbn13: null,
            error: safeError(error),
          };
        }
      }
    },
  );

  await Promise.all(workers);

  const recoverable = results.filter(
    (result) => Boolean(result.recoveredAuthorName || result.recoveredIsbn13),
  );
  const unresolved = results.filter(
    (result) =>
      !result.error
      && !result.recoveredAuthorName
      && !result.recoveredIsbn13,
  );
  const errors = results.filter((result) => Boolean(result.error));

  return {
    mode: "read_only" as const,
    sourceCode: "idefix",
    candidateCount: candidates.length,
    recoverableCount: recoverable.length,
    recoveredAuthorCount: recoverable.filter(
      (result) => Boolean(result.recoveredAuthorName),
    ).length,
    recoveredIsbn13Count: recoverable.filter(
      (result) => Boolean(result.recoveredIsbn13),
    ).length,
    unresolvedCount: unresolved.length,
    errorCount: errors.length,
    recoverableSamples: recoverable.slice(0, 30),
    unresolvedSamples: unresolved.slice(0, 20),
    errorSamples: errors.slice(0, 20),
  };
}
