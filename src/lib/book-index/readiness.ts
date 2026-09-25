import "server-only";

import { prisma } from "@/lib/prisma";

import { BOOK_INDEX_LISTS } from "./lists";

export type BookIndexCollisionCandidate = {
  title: string;
  authorName: string | null;
  sourceCodes: string[];
  masterBookCount: number;
  variants: Array<{
    sourceCode: string;
    masterBookId: string | null;
    isbn13: string | null;
    isbn10: string | null;
    publisherName: string | null;
  }>;
};

export type BookIndexTitleOverlapSample = {
  title: string;
  sourceCodes: string[];
  authorNames: Array<string | null>;
  isbn13s: string[];
};

export type BookIndexReadinessSnapshot = {
  compositeSourceTarget: number;
  observedCompositeSources: number;
  observedCompositeSourceCodes: string[];
  externalBookCount: number;
  matchedExternalBookCount: number;
  unmatchedExternalBookCount: number;
  matchCoveragePercent: number;
  maxCompositeSourcesPerBook: number;
  booksOnAtLeast2CompositeSources: number;
  booksOnAtLeast3CompositeSources: number;
  normalizedIdentityKeysOnAtLeast2Sources: number;
  normalizedIdentityKeysOnAtLeast3Sources: number;
  splitMasterCollisionCount: number;
  splitMasterCollisionSamples: BookIndexCollisionCandidate[];
  normalizedTitleKeysOnAtLeast2Sources: number;
  normalizedTitleKeysOnAtLeast3Sources: number;
  normalizedTitleDifferentAuthorCount: number;
  normalizedTitleDifferentAuthorSamples: BookIndexTitleOverlapSample[];
  isbn13KeysOnAtLeast2Sources: number;
  isbn13KeysOnAtLeast3Sources: number;
  firstObservationAt: Date | null;
  lastObservationAt: Date | null;
  historySpanDays: number;
  publicRolloutState: "gated";
};

function historySpanDays(first: Date | null, last: Date | null) {
  if (!first || !last) return 0;
  return Math.max(0, Math.floor((last.getTime() - first.getTime()) / 86_400_000));
}

export async function getBookIndexReadinessSnapshot(): Promise<BookIndexReadinessSnapshot> {
  const compositeSourceCodes = [...new Set(
    BOOK_INDEX_LISTS
      .filter((list) => list.enabled && list.includeInComposite)
      .map((list) => list.sourceCode),
  )];

  const [externalBookCount, matchedExternalBookCount, observationRange, persistedCompositeLists] =
    await Promise.all([
      prisma.bookIndexExternalBook.count(),
      prisma.bookIndexExternalBook.count({ where: { masterBookId: { not: null } } }),
      prisma.bookIndexObservation.aggregate({
        _min: { observedAt: true },
        _max: { observedAt: true },
      }),
      prisma.bookIndexList.findMany({
        where: {
          active: true,
          includeInComposite: true,
          source: { includeInTurkeyIndex: true, status: "active" },
        },
        select: {
          source: { select: { code: true } },
          fetchRuns: {
            where: { status: { in: ["success", "no_change"] } },
            orderBy: { startedAt: "desc" },
            take: 1,
            select: {
              id: true,
              observations: {
                select: {
                  externalBook: {
                    select: {
                      title: true,
                      authorName: true,
                      normalizedTitle: true,
                      normalizedAuthor: true,
                      masterBookId: true,
                      isbn13: true,
                      isbn10: true,
                      publisherName: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

  const observedCompositeSourceCodes = [...new Set(
    persistedCompositeLists
      .filter((list) => list.fetchRuns.length > 0)
      .map((list) => list.source.code),
  )].sort((a, b) => a.localeCompare(b, "tr"));

  const sourceCodesByMasterBook = new Map<string, Set<string>>();
  const titleBuckets = new Map<string, {
    title: string;
    sourceCodes: Set<string>;
    authorNames: Set<string>;
    hasNullAuthor: boolean;
    isbn13s: Set<string>;
  }>();
  const isbn13Buckets = new Map<string, Set<string>>();
  const identityBuckets = new Map<string, {
    title: string;
    authorName: string | null;
    sourceCodes: Set<string>;
    masterBookIds: Set<string>;
    variants: Array<{
      sourceCode: string;
      masterBookId: string | null;
      isbn13: string | null;
      isbn10: string | null;
      publisherName: string | null;
    }>;
  }>();

  for (const list of persistedCompositeLists) {
    const latestRun = list.fetchRuns[0];
    if (!latestRun) continue;

    for (const observation of latestRun.observations) {
      const book = observation.externalBook;

      if (book.masterBookId) {
        const sourceCodes = sourceCodesByMasterBook.get(book.masterBookId) ?? new Set<string>();
        sourceCodes.add(list.source.code);
        sourceCodesByMasterBook.set(book.masterBookId, sourceCodes);
      }

      if (book.normalizedTitle) {
        const titleBucket = titleBuckets.get(book.normalizedTitle) ?? {
          title: book.title,
          sourceCodes: new Set<string>(),
          authorNames: new Set<string>(),
          hasNullAuthor: false,
          isbn13s: new Set<string>(),
        };
        titleBucket.sourceCodes.add(list.source.code);
        if (book.authorName) titleBucket.authorNames.add(book.authorName);
        else titleBucket.hasNullAuthor = true;
        if (book.isbn13) titleBucket.isbn13s.add(book.isbn13);
        titleBuckets.set(book.normalizedTitle, titleBucket);
      }

      if (book.isbn13) {
        const isbnSources = isbn13Buckets.get(book.isbn13) ?? new Set<string>();
        isbnSources.add(list.source.code);
        isbn13Buckets.set(book.isbn13, isbnSources);
      }

      if (book.normalizedTitle && book.normalizedAuthor) {
        const key = `${book.normalizedTitle}|${book.normalizedAuthor}`;
        const bucket = identityBuckets.get(key) ?? {
          title: book.title,
          authorName: book.authorName,
          sourceCodes: new Set<string>(),
          masterBookIds: new Set<string>(),
          variants: [],
        };
        bucket.sourceCodes.add(list.source.code);
        if (book.masterBookId) bucket.masterBookIds.add(book.masterBookId);
        bucket.variants.push({
          sourceCode: list.source.code,
          masterBookId: book.masterBookId,
          isbn13: book.isbn13,
          isbn10: book.isbn10,
          publisherName: book.publisherName,
        });
        identityBuckets.set(key, bucket);
      }
    }
  }

  const compositeSourceCounts = [...sourceCodesByMasterBook.values()].map((sourceCodes) => sourceCodes.size);
  const identityValues = [...identityBuckets.values()];
  const splitMasterCollisions = identityValues
    .filter((bucket) => bucket.sourceCodes.size >= 2 && bucket.masterBookIds.size > 1)
    .sort((a, b) => b.sourceCodes.size - a.sourceCodes.size || b.masterBookIds.size - a.masterBookIds.size);
  const titleValues = [...titleBuckets.values()];
  const crossSourceTitles = titleValues.filter((bucket) => bucket.sourceCodes.size >= 2);
  const differentAuthorTitles = crossSourceTitles
    .filter((bucket) => bucket.authorNames.size + Number(bucket.hasNullAuthor) > 1)
    .sort((a, b) => b.sourceCodes.size - a.sourceCodes.size || a.title.localeCompare(b.title, "tr"));
  const isbn13Values = [...isbn13Buckets.values()];

  const firstObservationAt = observationRange._min.observedAt ?? null;
  const lastObservationAt = observationRange._max.observedAt ?? null;
  const unmatchedExternalBookCount = externalBookCount - matchedExternalBookCount;

  return {
    compositeSourceTarget: compositeSourceCodes.length,
    observedCompositeSources: observedCompositeSourceCodes.length,
    observedCompositeSourceCodes,
    externalBookCount,
    matchedExternalBookCount,
    unmatchedExternalBookCount,
    matchCoveragePercent: externalBookCount
      ? Math.round((matchedExternalBookCount / externalBookCount) * 1000) / 10
      : 0,
    maxCompositeSourcesPerBook: compositeSourceCounts.length ? Math.max(...compositeSourceCounts) : 0,
    booksOnAtLeast2CompositeSources: compositeSourceCounts.filter((count) => count >= 2).length,
    booksOnAtLeast3CompositeSources: compositeSourceCounts.filter((count) => count >= 3).length,
    normalizedIdentityKeysOnAtLeast2Sources: identityValues.filter((bucket) => bucket.sourceCodes.size >= 2).length,
    normalizedIdentityKeysOnAtLeast3Sources: identityValues.filter((bucket) => bucket.sourceCodes.size >= 3).length,
    splitMasterCollisionCount: splitMasterCollisions.length,
    splitMasterCollisionSamples: splitMasterCollisions.slice(0, 12).map((bucket) => ({
      title: bucket.title,
      authorName: bucket.authorName,
      sourceCodes: [...bucket.sourceCodes].sort(),
      masterBookCount: bucket.masterBookIds.size,
      variants: bucket.variants
        .sort((a, b) => a.sourceCode.localeCompare(b.sourceCode, "tr"))
        .map((variant) => ({
          sourceCode: variant.sourceCode,
          masterBookId: variant.masterBookId,
          isbn13: variant.isbn13,
          isbn10: variant.isbn10,
          publisherName: variant.publisherName,
        })),
    })),
    normalizedTitleKeysOnAtLeast2Sources: crossSourceTitles.length,
    normalizedTitleKeysOnAtLeast3Sources: crossSourceTitles.filter(
      (bucket) => bucket.sourceCodes.size >= 3,
    ).length,
    normalizedTitleDifferentAuthorCount: differentAuthorTitles.length,
    normalizedTitleDifferentAuthorSamples: differentAuthorTitles.slice(0, 12).map(
      (bucket) => ({
        title: bucket.title,
        sourceCodes: [...bucket.sourceCodes].sort(),
        authorNames: [
          ...[...bucket.authorNames].sort((a, b) => a.localeCompare(b, "tr")),
          ...(bucket.hasNullAuthor ? [null] : []),
        ],
        isbn13s: [...bucket.isbn13s].sort(),
      }),
    ),
    isbn13KeysOnAtLeast2Sources: isbn13Values.filter(
      (sourceCodes) => sourceCodes.size >= 2,
    ).length,
    isbn13KeysOnAtLeast3Sources: isbn13Values.filter(
      (sourceCodes) => sourceCodes.size >= 3,
    ).length,
    firstObservationAt,
    lastObservationAt,
    historySpanDays: historySpanDays(firstObservationAt, lastObservationAt),
    publicRolloutState: "gated",
  };
}
