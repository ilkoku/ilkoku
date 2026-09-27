import "server-only";

import { prisma } from "@/lib/prisma";

import { normalizeBookIndexText } from "./html";
import { autoMatchBookIndexExternalBook } from "./matching";
import {
  acquireBookIndexSchedulerLease,
  releaseBookIndexSchedulerLease,
} from "./scheduler-lease";
import { parseIdefixProductDetails } from "./sources/idefix";

const SOURCE_CODE = "idefix";
const MAX_CANDIDATES = 100;
const DETAIL_CONCURRENCY = 6;
const SAMPLE_LIMIT = 100;

type Candidate = {
  id: string;
  sourceId: string;
  sourceKey: string;
  title: string;
  authorName: string | null;
  publisherName: string | null;
  isbn13: string | null;
  isbn10: string | null;
  productUrl: string;
  imageUrl: string | null;
  matchStatus: "unmatched" | "auto_matched" | "manual_matched" | "rejected";
  masterBookId: string | null;
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
  return "BOOK_INDEX_IDEFIX_HISTORY_BACKFILL_UNKNOWN_ERROR";
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

export async function backfillIdefixHistoricalMetadata(
  limit = MAX_CANDIDATES,
) {
  const lease = await acquireBookIndexSchedulerLease();

  if (!lease.acquired) {
    return {
      sourceCode: SOURCE_CODE,
      mode: "busy" as const,
      lockedUntil: lease.lockedUntil,
    };
  }

  try {
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
        id: true,
        sourceId: true,
        sourceKey: true,
        title: true,
        authorName: true,
        publisherName: true,
        isbn13: true,
        isbn10: true,
        productUrl: true,
        imageUrl: true,
        matchStatus: true,
        masterBookId: true,
        firstSeenAt: true,
        lastSeenAt: true,
      },
    });

    const details = new Array<DetailResult>(candidates.length);
    let nextIndex = 0;

    const workers = Array.from(
      { length: Math.min(DETAIL_CONCURRENCY, candidates.length) },
      async () => {
        while (true) {
          const index = nextIndex;
          nextIndex += 1;

          if (index >= candidates.length) return;
          details[index] = await fetchDetail(candidates[index]);
        }
      },
    );

    await Promise.all(workers);

    const fetchErrors = details.flatMap((result, index) => {
      if (result?.ok) return [];

      return [{
        sourceKey: candidates[index]?.sourceKey ?? "unknown",
        error:
          result?.error
          ?? "BOOK_INDEX_IDEFIX_HISTORY_BACKFILL_NO_RESULT",
      }];
    });

    if (fetchErrors.length > 0) {
      throw new Error(
        `BOOK_INDEX_IDEFIX_HISTORY_BACKFILL_FETCH_FAILED_${fetchErrors.length}`,
      );
    }

    const recoverableCandidateCount = candidates.filter((candidate, index) => {
      const detail = details[index];
      if (!detail?.ok) return false;

      return Boolean(
        (!candidate.authorName && detail.authorName)
        || (!candidate.isbn13 && detail.isbn13),
      );
    }).length;

    let metadataUpdatedCount = 0;
    let matchedCount = 0;
    let pendingAfterMetadataCount = 0;
    let skippedRaceCount = 0;
    let unresolvedCount = 0;

    const updatedSamples: Array<{
      sourceKey: string;
      title: string;
      recoveredAuthorName: string | null;
      recoveredIsbn13: string | null;
      matched: boolean;
      masterBookId: string | null;
    }> = [];

    for (let index = 0; index < candidates.length; index += 1) {
      const candidate = candidates[index];
      const detail = details[index];

      if (!detail?.ok) {
        throw new Error("BOOK_INDEX_IDEFIX_HISTORY_BACKFILL_DETAIL_STATE_INVALID");
      }

      const result = await prisma.$transaction(async (transaction) => {
        const current = await transaction.bookIndexExternalBook.findUnique({
          where: { id: candidate.id },
          select: {
            id: true,
            sourceId: true,
            sourceKey: true,
            title: true,
            authorName: true,
            publisherName: true,
            isbn13: true,
            isbn10: true,
            imageUrl: true,
            matchStatus: true,
            masterBookId: true,
            firstSeenAt: true,
            lastSeenAt: true,
          },
        });

        if (
          !current
          || current.sourceId !== source.id
          || current.matchStatus !== "unmatched"
          || current.masterBookId
        ) {
          return {
            status: "skipped_race" as const,
          };
        }

        const recoveredAuthorName = current.authorName
          ? null
          : detail.authorName;
        const recoveredIsbn13 = current.isbn13
          ? null
          : detail.isbn13;

        if (!recoveredAuthorName && !recoveredIsbn13) {
          return {
            status: "unresolved" as const,
          };
        }

        const updated = await transaction.bookIndexExternalBook.update({
          where: { id: current.id },
          data: {
            ...(recoveredAuthorName
              ? {
                  authorName: recoveredAuthorName,
                  normalizedAuthor:
                    normalizeBookIndexText(recoveredAuthorName),
                }
              : {}),
            ...(recoveredIsbn13
              ? { isbn13: recoveredIsbn13 }
              : {}),
          },
          select: {
            id: true,
            title: true,
            authorName: true,
            publisherName: true,
            isbn13: true,
            isbn10: true,
            imageUrl: true,
            matchStatus: true,
            masterBookId: true,
          },
        });

        const match = await autoMatchBookIndexExternalBook(
          transaction,
          updated,
          current.lastSeenAt,
        );

        if (match.masterBookId) {
          const bounds = await transaction.bookIndexExternalBook.aggregate({
            where: { masterBookId: match.masterBookId },
            _min: { firstSeenAt: true },
            _max: { lastSeenAt: true },
          });

          if (bounds._min.firstSeenAt && bounds._max.lastSeenAt) {
            await transaction.bookIndexBook.update({
              where: { id: match.masterBookId },
              data: {
                firstSeenAt: bounds._min.firstSeenAt,
                lastSeenAt: bounds._max.lastSeenAt,
              },
            });
          }
        }

        return {
          status: "updated" as const,
          sourceKey: current.sourceKey,
          title: current.title,
          recoveredAuthorName,
          recoveredIsbn13,
          matched: match.matched,
          masterBookId: match.masterBookId,
        };
      });

      if (result.status === "skipped_race") {
        skippedRaceCount += 1;
        continue;
      }

      if (result.status === "unresolved") {
        unresolvedCount += 1;
        continue;
      }

      metadataUpdatedCount += 1;
      if (result.matched) matchedCount += 1;
      else pendingAfterMetadataCount += 1;

      updatedSamples.push({
        sourceKey: result.sourceKey,
        title: result.title,
        recoveredAuthorName: result.recoveredAuthorName,
        recoveredIsbn13: result.recoveredIsbn13,
        matched: result.matched,
        masterBookId: result.masterBookId,
      });
    }

    return {
      sourceCode: SOURCE_CODE,
      mode: "apply" as const,
      candidateLimit: safeLimit,
      candidateCount: candidates.length,
      fetchSuccessCount: candidates.length,
      fetchErrorCount: 0,
      recoverableCandidateCount,
      metadataUpdatedCount,
      matchedCount,
      pendingAfterMetadataCount,
      skippedRaceCount,
      unresolvedCount,
      updatedSamples: updatedSamples.slice(0, SAMPLE_LIMIT),
    };
  } finally {
    await releaseBookIndexSchedulerLease(lease.token);
  }
}
