import { createHash } from "node:crypto";

import type { PrismaClient } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

import { normalizeBookIndexText } from "./html";

type BookIndexMatchDb = Pick<
  PrismaClient,
  "bookIndexBook" | "bookIndexExternalBook"
>;

type BookIndexMasterMatch = {
  id: string;
  isbn13: string | null;
  isbn10: string | null;
};

export type BookIndexMatchCandidate = {
  id: string;
  title: string;
  authorName: string | null;
  publisherName: string | null;
  isbn13: string | null;
  isbn10: string | null;
  imageUrl: string | null;
  matchStatus: "unmatched" | "auto_matched" | "manual_matched" | "rejected";
  masterBookId: string | null;
};

function slugPart(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/ı/gu, "i")
    .replace(/İ/gu, "I")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 180);
}

function masterSlug(input: {
  title: string;
  isbn13: string | null;
  isbn10: string | null;
  normalizedTitle: string;
  normalizedAuthor: string | null;
}) {
  const identity =
    input.isbn13 ||
    input.isbn10 ||
    `${input.normalizedTitle}|${input.normalizedAuthor ?? ""}`;
  const digest = createHash("sha256").update(identity).digest("hex").slice(0, 12);
  return `${slugPart(input.title) || "kitap"}-${digest}`;
}

function isbnCompatible(
  externalBook: BookIndexMatchCandidate,
  master: BookIndexMasterMatch,
) {
  if (
    externalBook.isbn13 &&
    master.isbn13 &&
    externalBook.isbn13 !== master.isbn13
  ) {
    return false;
  }

  if (
    externalBook.isbn10 &&
    master.isbn10 &&
    externalBook.isbn10 !== master.isbn10
  ) {
    return false;
  }

  return true;
}

async function linkMaster(
  db: BookIndexMatchDb,
  externalBook: BookIndexMatchCandidate,
  master: BookIndexMasterMatch,
  confidence: number,
  seenAt: Date,
) {
  await db.bookIndexBook.update({
    where: { id: master.id },
    data: {
      lastSeenAt: seenAt,
      ...(!master.isbn13 && externalBook.isbn13
        ? { isbn13: externalBook.isbn13 }
        : {}),
      ...(!master.isbn10 && externalBook.isbn10
        ? { isbn10: externalBook.isbn10 }
        : {}),
    },
  });

  await db.bookIndexExternalBook.update({
    where: { id: externalBook.id },
    data: {
      masterBookId: master.id,
      matchStatus: "auto_matched",
      matchConfidence: confidence,
    },
  });

  return {
    matched: true as const,
    masterBookId: master.id,
    confidence,
  };
}

export async function autoMatchBookIndexExternalBook(
  db: BookIndexMatchDb,
  externalBook: BookIndexMatchCandidate,
  seenAt: Date,
) {
  if (
    externalBook.masterBookId ||
    externalBook.matchStatus === "manual_matched" ||
    externalBook.matchStatus === "rejected"
  ) {
    return {
      matched: Boolean(externalBook.masterBookId),
      masterBookId: externalBook.masterBookId,
      confidence: null,
    };
  }

  const normalizedTitle = normalizeBookIndexText(externalBook.title);
  const normalizedAuthor = externalBook.authorName
    ? normalizeBookIndexText(externalBook.authorName)
    : null;

  let existing: BookIndexMasterMatch | null = null;
  let confidence = 0;

  if (externalBook.isbn13) {
    existing = await db.bookIndexBook.findUnique({
      where: { isbn13: externalBook.isbn13 },
      select: { id: true, isbn13: true, isbn10: true },
    });

    if (existing) confidence = 1;
  }

  if (!existing && externalBook.isbn10) {
    existing = await db.bookIndexBook.findUnique({
      where: { isbn10: externalBook.isbn10 },
      select: { id: true, isbn13: true, isbn10: true },
    });

    if (existing) confidence = 0.98;
  }

  if (!existing && normalizedAuthor) {
    const candidates = await db.bookIndexBook.findMany({
      where: {
        normalizedTitle,
        normalizedAuthor,
      },
      select: {
        id: true,
        isbn13: true,
        isbn10: true,
      },
      take: 3,
    });

    const compatibleCandidates = candidates.filter((candidate) =>
      isbnCompatible(externalBook, candidate),
    );

    if (compatibleCandidates.length > 1) {
      return {
        matched: false as const,
        masterBookId: null,
        confidence: null,
      };
    }

    existing = compatibleCandidates[0] ?? null;
    if (existing) confidence = 0.92;
  }

  if (
    !existing &&
    !externalBook.isbn13 &&
    !externalBook.isbn10 &&
    !normalizedAuthor
  ) {
    return {
      matched: false as const,
      masterBookId: null,
      confidence: null,
    };
  }

  if (existing) {
    return linkMaster(
      db,
      externalBook,
      existing,
      confidence,
      seenAt,
    );
  }

  const master = await db.bookIndexBook.create({
    data: {
      slug: masterSlug({
        title: externalBook.title,
        isbn13: externalBook.isbn13,
        isbn10: externalBook.isbn10,
        normalizedTitle,
        normalizedAuthor,
      }),
      title: externalBook.title,
      normalizedTitle,
      authorName: externalBook.authorName,
      normalizedAuthor,
      publisherName: externalBook.publisherName,
      isbn13: externalBook.isbn13,
      isbn10: externalBook.isbn10,
      coverUrl: externalBook.imageUrl,
      firstSeenAt: seenAt,
      lastSeenAt: seenAt,
    },
    select: {
      id: true,
      isbn13: true,
      isbn10: true,
    },
  });

  return linkMaster(
    db,
    externalBook,
    master,
    confidence,
    seenAt,
  );
}

export async function matchPendingBookIndexBooks(limit = 200) {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 500);
  const candidates = await prisma.bookIndexExternalBook.findMany({
    where: {
      masterBookId: null,
      matchStatus: "unmatched",
    },
    orderBy: { lastSeenAt: "desc" },
    take: safeLimit,
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
      lastSeenAt: true,
    },
  });

  let matched = 0;
  let pending = 0;

  for (const candidate of candidates) {
    const result = await prisma.$transaction((transaction) =>
      autoMatchBookIndexExternalBook(
        transaction,
        candidate,
        candidate.lastSeenAt,
      ),
    );

    if (result.matched) matched += 1;
    else pending += 1;
  }

  return {
    processed: candidates.length,
    matched,
    pending,
  };
}


export async function repairSafeSplitBookIndexMasters(limit = 100) {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 500);
  const externalBooks = await prisma.bookIndexExternalBook.findMany({
    where: {
      masterBookId: { not: null },
      normalizedAuthor: { not: null },
      source: {
        includeInTurkeyIndex: true,
        status: "active",
      },
    },
    select: {
      id: true,
      masterBookId: true,
      normalizedTitle: true,
      normalizedAuthor: true,
      isbn13: true,
      isbn10: true,
      matchStatus: true,
      lastSeenAt: true,
      source: {
        select: {
          code: true,
        },
      },
    },
  });

  const buckets = new Map<string, typeof externalBooks>();
  for (const book of externalBooks) {
    const key = `${book.normalizedTitle}|${book.normalizedAuthor}`;
    const bucket = buckets.get(key) ?? [];
    bucket.push(book);
    buckets.set(key, bucket);
  }

  let considered = 0;
  let mergedGroups = 0;
  let reassignedExternalBooks = 0;
  let deletedMasters = 0;
  let skippedManual = 0;
  let skippedAmbiguous = 0;

  for (const bucket of buckets.values()) {
    if (considered >= safeLimit) break;

    const sourceCodes = new Set(bucket.map((book) => book.source.code));
    const masterIds = [...new Set(
      bucket
        .map((book) => book.masterBookId)
        .filter((value): value is string => Boolean(value)),
    )];

    if (sourceCodes.size < 2 || masterIds.length < 2) continue;
    considered += 1;

    if (bucket.some((book) =>
      book.matchStatus === "manual_matched" || book.matchStatus === "rejected"
    )) {
      skippedManual += 1;
      continue;
    }

    const masters = await prisma.bookIndexBook.findMany({
      where: { id: { in: masterIds } },
      select: {
        id: true,
        isbn13: true,
        isbn10: true,
        firstSeenAt: true,
        lastSeenAt: true,
      },
    });

    const mastersWithIsbn = masters.filter((master) => master.isbn13 || master.isbn10);
    if (mastersWithIsbn.length !== 1) {
      skippedAmbiguous += 1;
      continue;
    }

    const target = mastersWithIsbn[0];
    const loserIds = masterIds.filter((id) => id !== target.id);

    const loserExternalBooks = bucket.filter((book) =>
      book.masterBookId && loserIds.includes(book.masterBookId)
    );
    if (loserExternalBooks.some((book) => book.isbn13 || book.isbn10)) {
      skippedAmbiguous += 1;
      continue;
    }

    const targetIsbn13 = target.isbn13;
    const targetIsbn10 = target.isbn10;
    const conflictingExternalIsbn = bucket.some((book) =>
      (book.isbn13 && targetIsbn13 && book.isbn13 !== targetIsbn13)
      || (book.isbn10 && targetIsbn10 && book.isbn10 !== targetIsbn10)
    );
    if (conflictingExternalIsbn) {
      skippedAmbiguous += 1;
      continue;
    }

    const firstSeenAt = masters.reduce(
      (earliest, master) =>
        master.firstSeenAt < earliest ? master.firstSeenAt : earliest,
      target.firstSeenAt,
    );
    const lastSeenAt = bucket.reduce(
      (latest, book) => book.lastSeenAt > latest ? book.lastSeenAt : latest,
      target.lastSeenAt,
    );

    const reassigned = await prisma.$transaction(async (transaction) => {
      const updated = await transaction.bookIndexExternalBook.updateMany({
        where: {
          masterBookId: { in: loserIds },
        },
        data: {
          masterBookId: target.id,
          matchStatus: "auto_matched",
          matchConfidence: 0.92,
        },
      });

      await transaction.bookIndexBook.update({
        where: { id: target.id },
        data: {
          firstSeenAt,
          lastSeenAt,
        },
      });

      const deleted = await transaction.bookIndexBook.deleteMany({
        where: {
          id: { in: loserIds },
          externalBooks: { none: {} },
        },
      });

      return {
        reassigned: updated.count,
        deleted: deleted.count,
      };
    });

    mergedGroups += 1;
    reassignedExternalBooks += reassigned.reassigned;
    deletedMasters += reassigned.deleted;
  }

  return {
    considered,
    mergedGroups,
    reassignedExternalBooks,
    deletedMasters,
    skippedManual,
    skippedAmbiguous,
  };
}
