import "server-only";

import { prisma } from "@/lib/prisma";

import { normalizeBookIndexText } from "./html";
import { probeIdefixHistoricalMetadata } from "./idefix-history-probe";
import { autoMatchBookIndexExternalBook } from "./matching";
import {
  acquireBookIndexSchedulerLease,
  releaseBookIndexSchedulerLease,
} from "./scheduler-lease";

const SOURCE_CODE = "idefix";

export async function backfillIdefixHistoricalMetadata() {
  const lease = await acquireBookIndexSchedulerLease();

  if (!lease.acquired) {
    return {
      status: "busy" as const,
      lockedUntil: lease.lockedUntil,
      candidateCount: 0,
      recoverableCount: 0,
      updatedCount: 0,
      matchedCount: 0,
      pendingCount: 0,
      skippedCount: 0,
    };
  }

  try {
    const probe = await probeIdefixHistoricalMetadata();

    if (probe.fetchErrorCount > 0) {
      throw new Error("BOOK_INDEX_IDEFIX_HISTORY_BACKFILL_FETCH_ERRORS");
    }

    const source = await prisma.bookIndexSource.findUnique({
      where: { code: SOURCE_CODE },
      select: { id: true },
    });

    if (!source) {
      throw new Error("BOOK_INDEX_IDEFIX_SOURCE_NOT_FOUND");
    }

    let updatedCount = 0;
    let matchedCount = 0;
    let pendingCount = 0;
    let skippedCount = 0;

    for (const sample of probe.recoverableSamples) {
      const outcome = await prisma.$transaction(async (transaction) => {
        const current = await transaction.bookIndexExternalBook.findUnique({
          where: {
            sourceId_sourceKey: {
              sourceId: source.id,
              sourceKey: sample.sourceKey,
            },
          },
          select: {
            id: true,
            title: true,
            authorName: true,
            normalizedAuthor: true,
            publisherName: true,
            isbn13: true,
            isbn10: true,
            imageUrl: true,
            matchStatus: true,
            masterBookId: true,
            lastSeenAt: true,
          },
        });

        if (
          !current
          || current.matchStatus !== "unmatched"
          || current.masterBookId
        ) {
          return { updated: false, matched: false };
        }

        const authorName =
          current.authorName
          || sample.recoveredAuthorName
          || null;
        const isbn13 =
          current.isbn13
          || sample.recoveredIsbn13
          || null;

        const authorChanged =
          !current.authorName && Boolean(sample.recoveredAuthorName);
        const isbnChanged =
          !current.isbn13 && Boolean(sample.recoveredIsbn13);

        if (!authorChanged && !isbnChanged) {
          return { updated: false, matched: false };
        }

        const updated = await transaction.bookIndexExternalBook.update({
          where: { id: current.id },
          data: {
            authorName,
            normalizedAuthor: authorName
              ? normalizeBookIndexText(authorName)
              : current.normalizedAuthor,
            isbn13,
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

        return {
          updated: true,
          matched: match.matched,
        };
      });

      if (!outcome.updated) {
        skippedCount += 1;
      } else if (outcome.matched) {
        updatedCount += 1;
        matchedCount += 1;
      } else {
        updatedCount += 1;
        pendingCount += 1;
      }
    }

    const remainingUnmatched = await prisma.bookIndexExternalBook.count({
      where: {
        sourceId: source.id,
        matchStatus: "unmatched",
        masterBookId: null,
      },
    });

    return {
      status: "success" as const,
      candidateCount: probe.candidateCount,
      recoverableCount: probe.recoverableIdentityCount,
      updatedCount,
      matchedCount,
      pendingCount,
      skippedCount,
      remainingUnmatched,
    };
  } finally {
    await releaseBookIndexSchedulerLease(lease.token);
  }
}
