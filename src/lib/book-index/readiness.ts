import "server-only";

import { prisma } from "@/lib/prisma";

import { normalizeBookIndexText } from "./html";
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

export type BookIndexEditionFamilySample = {
  familyTitle: string;
  authorName: string | null;
  sourceCodes: string[];
  titles: string[];
};

export type BookIndexSourcePairOverlap = {
  sourceCodeA: string;
  sourceCodeB: string;
  sharedBookCount: number;
};

export type BookIndexNearThreeSample = {
  masterBookId: string;
  title: string;
  authorName: string | null;
  isbn13s: string[];
  sourceCodes: string[];
  absentObservedSourceCodes: string[];
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
  editionFamilyIdentityKeysOnAtLeast2Sources: number;
  editionFamilyIdentityKeysOnAtLeast3Sources: number;
  editionFamilyVariantOverlapCount: number;
  editionFamilyVariantOverlapSamples: BookIndexEditionFamilySample[];
  sourcePairOverlapMatrix: BookIndexSourcePairOverlap[];
  nearThreeSourceCount: number;
  nearThreeSourceSamples: BookIndexNearThreeSample[];
  firstObservationAt: Date | null;
  lastObservationAt: Date | null;
  historySpanDays: number;
  publicRolloutState: "gated";
};

const EDITION_FAMILY_SUFFIXES = [
  "yan boyamalı ciltli özel baskı",
  "özel baskı hediyeli kutu",
  "ciltli hediyeli kutu",
  "hediyeli kutu özel baskı",
  "kutulu özel set",
  "hediyeli kutu",
  "ciltli özel baskı",
  "özel baskı",
  "yan boyamalı",
  "kutulu set",
  "kutulu",
  "ciltli",
] as const;

function editionFamilyTitle(value: string) {
  let normalized = normalizeBookIndexText(value);
  let changed = true;

  while (changed && normalized) {
    changed = false;

    for (const suffix of EDITION_FAMILY_SUFFIXES) {
      const ending = ` ${suffix}`;
      if (!normalized.endsWith(ending)) continue;

      normalized = normalized.slice(0, -ending.length).trim();
      changed = true;
      break;
    }
  }

  return normalized;
}

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
  const masterBookDetails = new Map<string, {
    title: string;
    authorName: string | null;
    isbn13s: Set<string>;
    sourceCodes: Set<string>;
  }>();
  const titleBuckets = new Map<string, {
    title: string;
    sourceCodes: Set<string>;
    authorNames: Set<string>;
    hasNullAuthor: boolean;
    isbn13s: Set<string>;
  }>();
  const isbn13Buckets = new Map<string, Set<string>>();
  const editionFamilyBuckets = new Map<string, {
    familyTitle: string;
    authorName: string | null;
    sourceCodes: Set<string>;
    titles: Set<string>;
    normalizedTitles: Set<string>;
  }>();
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

        const detail = masterBookDetails.get(book.masterBookId) ?? {
          title: book.title,
          authorName: book.authorName,
          isbn13s: new Set<string>(),
          sourceCodes: new Set<string>(),
        };
        detail.sourceCodes.add(list.source.code);
        if (book.isbn13) detail.isbn13s.add(book.isbn13);
        masterBookDetails.set(book.masterBookId, detail);
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

      if (book.normalizedAuthor) {
        const familyTitle = editionFamilyTitle(book.title);
        if (familyTitle) {
          const key = `${familyTitle}|${book.normalizedAuthor}`;
          const bucket = editionFamilyBuckets.get(key) ?? {
            familyTitle,
            authorName: book.authorName,
            sourceCodes: new Set<string>(),
            titles: new Set<string>(),
            normalizedTitles: new Set<string>(),
          };
          bucket.sourceCodes.add(list.source.code);
          bucket.titles.add(book.title);
          bucket.normalizedTitles.add(book.normalizedTitle);
          editionFamilyBuckets.set(key, bucket);
        }
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

  const sourcePairOverlapMatrix: BookIndexSourcePairOverlap[] = [];
  for (let leftIndex = 0; leftIndex < observedCompositeSourceCodes.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < observedCompositeSourceCodes.length;
      rightIndex += 1
    ) {
      const sourceCodeA = observedCompositeSourceCodes[leftIndex];
      const sourceCodeB = observedCompositeSourceCodes[rightIndex];
      const sharedBookCount = [...sourceCodesByMasterBook.values()].filter(
        (sourceCodes) => sourceCodes.has(sourceCodeA) && sourceCodes.has(sourceCodeB),
      ).length;
      sourcePairOverlapMatrix.push({ sourceCodeA, sourceCodeB, sharedBookCount });
    }
  }

  const nearThreeSourceCandidates = [...masterBookDetails.entries()]
    .filter(([, detail]) => detail.sourceCodes.size === 2)
    .map(([masterBookId, detail]) => ({
      masterBookId,
      title: detail.title,
      authorName: detail.authorName,
      isbn13s: [...detail.isbn13s].sort(),
      sourceCodes: [...detail.sourceCodes].sort((a, b) => a.localeCompare(b, "tr")),
      absentObservedSourceCodes: observedCompositeSourceCodes.filter(
        (sourceCode) => !detail.sourceCodes.has(sourceCode),
      ),
    }))
    .sort(
      (a, b) =>
        a.title.localeCompare(b.title, "tr")
        || a.masterBookId.localeCompare(b.masterBookId),
    );

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
  const editionFamilyValues = [...editionFamilyBuckets.values()];
  const editionFamilyCrossSource = editionFamilyValues.filter(
    (bucket) => bucket.sourceCodes.size >= 2,
  );
  const editionFamilyVariantOverlaps = editionFamilyCrossSource
    .filter((bucket) => bucket.normalizedTitles.size > 1)
    .sort(
      (a, b) =>
        b.sourceCodes.size - a.sourceCodes.size
        || a.familyTitle.localeCompare(b.familyTitle, "tr"),
    );

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
    editionFamilyIdentityKeysOnAtLeast2Sources: editionFamilyCrossSource.length,
    editionFamilyIdentityKeysOnAtLeast3Sources: editionFamilyCrossSource.filter(
      (bucket) => bucket.sourceCodes.size >= 3,
    ).length,
    editionFamilyVariantOverlapCount: editionFamilyVariantOverlaps.length,
    editionFamilyVariantOverlapSamples: editionFamilyVariantOverlaps.slice(0, 12).map(
      (bucket) => ({
        familyTitle: bucket.familyTitle,
        authorName: bucket.authorName,
        sourceCodes: [...bucket.sourceCodes].sort(),
        titles: [...bucket.titles].sort((a, b) => a.localeCompare(b, "tr")),
      }),
    ),
    sourcePairOverlapMatrix,
    nearThreeSourceCount: nearThreeSourceCandidates.length,
    nearThreeSourceSamples: nearThreeSourceCandidates.slice(0, 20),
    firstObservationAt,
    lastObservationAt,
    historySpanDays: historySpanDays(firstObservationAt, lastObservationAt),
    publicRolloutState: "gated",
  };
}
