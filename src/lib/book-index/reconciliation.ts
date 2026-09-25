import "server-only";

import { prisma } from "@/lib/prisma";

type ReconciliationGroup = {
  normalizedTitle: string;
  normalizedAuthor: string;
  sourceIds: Set<string>;
  masterIds: Set<string>;
  externalBooks: Array<{
    id: string;
    sourceId: string;
    masterBookId: string;
    isbn13: string | null;
    isbn10: string | null;
    lastSeenAt: Date;
  }>;
};

function distinctNonNull(values: Array<string | null>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function groupKey(normalizedTitle: string, normalizedAuthor: string) {
  return `${normalizedTitle}\u0000${normalizedAuthor}`;
}

export async function reconcileAutoMatchedBookIndexMasters(limit = 2000) {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 5000);

  const externalBooks = await prisma.bookIndexExternalBook.findMany({
    where: {
      matchStatus: "auto_matched",
      masterBookId: { not: null },
      normalizedAuthor: { not: null },
    },
    orderBy: { lastSeenAt: "desc" },
    take: safeLimit,
    select: {
      id: true,
      sourceId: true,
      masterBookId: true,
      normalizedTitle: true,
      normalizedAuthor: true,
      isbn13: true,
      isbn10: true,
      lastSeenAt: true,
    },
  });

  const groups = new Map<string, ReconciliationGroup>();

  for (const externalBook of externalBooks) {
    if (!externalBook.masterBookId || !externalBook.normalizedAuthor) continue;

    const key = groupKey(
      externalBook.normalizedTitle,
      externalBook.normalizedAuthor,
    );
    const current = groups.get(key) ?? {
      normalizedTitle: externalBook.normalizedTitle,
      normalizedAuthor: externalBook.normalizedAuthor,
      sourceIds: new Set<string>(),
      masterIds: new Set<string>(),
      externalBooks: [],
    };

    current.sourceIds.add(externalBook.sourceId);
    current.masterIds.add(externalBook.masterBookId);
    current.externalBooks.push({
      id: externalBook.id,
      sourceId: externalBook.sourceId,
      masterBookId: externalBook.masterBookId,
      isbn13: externalBook.isbn13,
      isbn10: externalBook.isbn10,
      lastSeenAt: externalBook.lastSeenAt,
    });
    groups.set(key, current);
  }

  let candidateGroups = 0;
  let mergedGroups = 0;
  let mergedMasters = 0;
  let relinkedExternalBooks = 0;
  let conflictGroups = 0;
  let protectedGroups = 0;

  for (const group of groups.values()) {
    if (group.sourceIds.size < 2 || group.masterIds.size < 2) continue;
    candidateGroups += 1;

    const masterIds = [...group.masterIds];
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

    if (masters.length < 2) continue;

    const attached = await prisma.bookIndexExternalBook.findMany({
      where: { masterBookId: { in: masterIds } },
      select: {
        id: true,
        masterBookId: true,
        matchStatus: true,
        isbn13: true,
        isbn10: true,
      },
    });

    if (attached.some((book) => book.matchStatus !== "auto_matched")) {
      protectedGroups += 1;
      continue;
    }

    const isbn13s = distinctNonNull([
      ...masters.map((master) => master.isbn13),
      ...attached.map((book) => book.isbn13),
    ]);
    const isbn10s = distinctNonNull([
      ...masters.map((master) => master.isbn10),
      ...attached.map((book) => book.isbn10),
    ]);

    if (isbn13s.length > 1 || isbn10s.length > 1) {
      conflictGroups += 1;
      continue;
    }

    const canonical = [...masters].sort(
      (a, b) =>
        Number(Boolean(b.isbn13)) - Number(Boolean(a.isbn13)) ||
        Number(Boolean(b.isbn10)) - Number(Boolean(a.isbn10)) ||
        a.firstSeenAt.getTime() - b.firstSeenAt.getTime() ||
        a.id.localeCompare(b.id),
    )[0];

    if (!canonical) continue;

    const donorIds = masters
      .map((master) => master.id)
      .filter((id) => id !== canonical.id);

    const firstSeenAt = new Date(
      Math.min(...masters.map((master) => master.firstSeenAt.getTime())),
    );
    const lastSeenAt = new Date(
      Math.max(...masters.map((master) => master.lastSeenAt.getTime())),
    );

    const merged = await prisma.$transaction(async (transaction) => {
      const relinked = await transaction.bookIndexExternalBook.updateMany({
        where: {
          masterBookId: { in: donorIds },
          matchStatus: "auto_matched",
        },
        data: {
          masterBookId: canonical.id,
          matchConfidence: 0.92,
        },
      });

      await transaction.bookIndexBook.deleteMany({
        where: { id: { in: donorIds } },
      });

      await transaction.bookIndexBook.update({
        where: { id: canonical.id },
        data: {
          isbn13: isbn13s[0] ?? canonical.isbn13,
          isbn10: isbn10s[0] ?? canonical.isbn10,
          firstSeenAt,
          lastSeenAt,
        },
      });

      return relinked.count;
    });

    mergedGroups += 1;
    mergedMasters += donorIds.length;
    relinkedExternalBooks += merged;
  }

  return {
    scannedExternalBooks: externalBooks.length,
    candidateGroups,
    mergedGroups,
    mergedMasters,
    relinkedExternalBooks,
    conflictGroups,
    protectedGroups,
  };
}
