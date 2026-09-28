import "server-only";

import { prisma } from "@/lib/prisma";

import { normalizeBookIndexText } from "./html";
import { BOOK_INDEX_LISTS } from "./lists";
import {
  getBookIndexSourceIndependenceGroup,
  getBookIndexSourceOperatorName,
} from "./sources";

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
  independenceGroupA: string;
  independenceGroupB: string;
  sameIndependenceGroup: boolean;
  sharedBookCount: number;
};

export type BookIndexIndependenceGroupSample = {
  independenceGroup: string;
  operatorName: string;
  sourceCodes: string[];
};

export type BookIndexOperatorEligibilityDeltaSample = {
  masterBookId: string;
  title: string;
  authorName: string | null;
  sourceCodes: string[];
  independenceGroups: string[];
  storefrontSourceCount: number;
  independentSourceCount: number;
};

export type BookIndexNearThreeHistoricalEvidence = {
  sourceCode: string;
  matchedBy: "master_book" | "isbn13" | "normalized_identity";
  listCodes: string[];
  periods: string[];
  firstObservedAt: Date;
  lastObservedAt: Date;
};

export type BookIndexNearThreeSample = {
  masterBookId: string;
  title: string;
  authorName: string | null;
  isbn13s: string[];
  sourceCodes: string[];
  independenceGroups: string[];
  independentSourceCount: number;
  absentObservedSourceCodes: string[];
  historicalThirdSourceCodes: string[];
  historicalThirdSourceEvidence: BookIndexNearThreeHistoricalEvidence[];
};

export type BookIndexCanaryHealth = {
  listCode: string;
  found: boolean;
  latestStatus: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  itemsFound: number | null;
  itemsStored: number | null;
  errorCode: string | null;
  errorMessage: string | null;
};

export type BookIndexCanaryShadowPairOverlap = {
  sourceCode: string;
  sharedBookCount: number;
};

export type BookIndexCanaryShadowSample = {
  masterBookId: string;
  title: string;
  authorName: string | null;
  currentSourceCodes: string[];
  currentIndependenceGroups: string[];
  projectedStorefrontSourceCount: number;
  projectedIndependentSourceCount: number;
};

export type BookIndexSourceHistoryMaturity = {
  sourceCode: string;
  successfulRunCount: number;
  firstSuccessfulRunAt: Date | null;
  lastSuccessfulRunAt: Date | null;
  historySpanHours: number;
  listCodes: string[];
};

export type BookIndexUnmatchedIdentityDuplicateSample = {
  sourceCode: string;
  title: string;
  authorName: string | null;
  normalizedTitle: string;
  normalizedAuthor: string | null;
  externalRecordCount: number;
  sourceKeys: string[];
  productUrls: string[];
  firstSeenAt: Date | null;
  lastSeenAt: Date | null;
};

export type BookIndexUnmatchedMissingAuthorSample = {
  sourceCode: string;
  title: string;
  normalizedTitle: string;
  sourceKey: string;
  productUrl: string;
  firstSeenAt: Date;
  lastSeenAt: Date;
};

export type BookIndexUnmatchedAmbiguousIdentitySample = {
  sourceCode: string;
  title: string;
  authorName: string;
  normalizedTitle: string;
  normalizedAuthor: string;
  sourceKey: string;
  masterCandidateCount: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
};

export type BookIndexReadinessSnapshot = {
  compositeSourceTarget: number;
  compositeIndependenceGroupTarget: number;
  observedCompositeSources: number;
  observedCompositeSourceCodes: string[];
  observedCompositeIndependenceGroups: number;
  observedCompositeIndependenceGroupCodes: string[];
  sharedOperatorGroupCount: number;
  sharedOperatorGroups: BookIndexIndependenceGroupSample[];
  externalBookCount: number;
  matchedExternalBookCount: number;
  unmatchedExternalBookCount: number;
  unmatchedExternalBooksBySource: Array<{
    sourceCode: string;
    count: number;
  }>;
  unmatchedDuplicateIdentityGroupCount: number;
  unmatchedDuplicateIdentityGroupsBySource: Array<{
    sourceCode: string;
    count: number;
  }>;
  unmatchedDuplicateIdentitySamples: BookIndexUnmatchedIdentityDuplicateSample[];
  unmatchedMissingAuthorBooksBySource: Array<{
    sourceCode: string;
    count: number;
  }>;
  unmatchedMissingAuthorWithIsbnBooksBySource: Array<{
    sourceCode: string;
    count: number;
  }>;
  unmatchedMissingAuthorWithoutIsbnBooksBySource: Array<{
    sourceCode: string;
    count: number;
  }>;
  unmatchedMissingAuthorSamples: BookIndexUnmatchedMissingAuthorSample[];
  unmatchedAmbiguousIdentityGroupCount: number;
  unmatchedAmbiguousIdentityGroupsBySource: Array<{
    sourceCode: string;
    count: number;
  }>;
  unmatchedAmbiguousIdentitySamples: BookIndexUnmatchedAmbiguousIdentitySample[];
  matchCoveragePercent: number;
  latestCompositeExternalBookCount: number;
  latestCompositeMatchedExternalBookCount: number;
  latestCompositeUnmatchedExternalBookCount: number;
  latestCompositeUnmatchedBooksBySource: Array<{
    sourceCode: string;
    count: number;
  }>;
  latestCompositeUnmatchedSamples: Array<{
    sourceCode: string;
    sourceKey: string;
    title: string;
    authorName: string | null;
    isbn13: string | null;
    isbn10: string | null;
    productUrl: string;
  }>;
  latestCompositeMatchCoveragePercent: number;
  maxCompositeSourcesPerBook: number;
  booksOnAtLeast2CompositeSources: number;
  booksOnAtLeast3CompositeSources: number;
  maxIndependentCompositeSourcesPerBook: number;
  booksOnAtLeast2IndependentCompositeSources: number;
  booksOnAtLeast3IndependentCompositeSources: number;
  storefrontEligibleButOperatorIneligibleCount: number;
  storefrontEligibleButOperatorIneligibleSamples: BookIndexOperatorEligibilityDeltaSample[];
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
  nearThreeWithHistoricalThirdSourceCount: number;
  nearThreeSourceSamples: BookIndexNearThreeSample[];
  kitaplarSepetteCanaryHealth: BookIndexCanaryHealth;
  kitaplarSepetteCanaryShadowBookCount: number;
  kitaplarSepetteCanaryShadowOverlapWithCompositeCount: number;
  kitaplarSepetteCanaryShadowWouldReach3StorefrontCount: number;
  kitaplarSepetteCanaryShadowWouldReach3IndependentCount: number;
  kitaplarSepetteCanaryShadowPairOverlap: BookIndexCanaryShadowPairOverlap[];
  kitaplarSepetteCanaryShadowSamples: BookIndexCanaryShadowSample[];
  kitapStoreCanaryHealth: BookIndexCanaryHealth;
  kitapStoreCanaryObservationCount: number;
  kitapStoreCanaryMatchedObservationCount: number;
  kitapStoreCanaryUnmatchedObservationCount: number;
  kitapStoreCanaryDuplicateMasterObservationCount: number;
  kitapStoreCanaryShadowBookCount: number;
  kitapStoreCanaryShadowOverlapWithCompositeCount: number;
  kitapStoreCanaryShadowWouldReach3StorefrontCount: number;
  kitapStoreCanaryShadowWouldReach3IndependentCount: number;
  kitapStoreCanaryShadowPairOverlap: BookIndexCanaryShadowPairOverlap[];
  kitapStoreCanaryShadowSamples: BookIndexCanaryShadowSample[];
  kitapSecGeneralCanaryHealth: BookIndexCanaryHealth;
  kitapSecGeneralCanaryShadowBookCount: number;
  kitapSecGeneralCanaryShadowOverlapWithCompositeCount: number;
  kitapSecGeneralCanaryShadowWouldReach3StorefrontCount: number;
  kitapSecGeneralCanaryShadowWouldReach3IndependentCount: number;
  kitapSecGeneralCanaryShadowPairOverlap: BookIndexCanaryShadowPairOverlap[];
  kitapSecGeneralCanaryShadowSamples: BookIndexCanaryShadowSample[];
  pandoraCanaryHealth: BookIndexCanaryHealth;
  pandoraCanaryShadowBookCount: number;
  pandoraCanaryShadowOverlapWithCompositeCount: number;
  pandoraCanaryShadowWouldReach3StorefrontCount: number;
  pandoraCanaryShadowWouldReach3IndependentCount: number;
  pandoraCanaryShadowPairOverlap: BookIndexCanaryShadowPairOverlap[];
  pandoraCanaryShadowSamples: BookIndexCanaryShadowSample[];
  kitapAmbariCanaryHealth: BookIndexCanaryHealth;
  kitapAmbariCanaryShadowBookCount: number;
  kitapAmbariCanaryShadowOverlapWithCompositeCount: number;
  kitapAmbariCanaryShadowWouldReach3StorefrontCount: number;
  kitapAmbariCanaryShadowWouldReach3IndependentCount: number;
  kitapAmbariCanaryShadowPairOverlap: BookIndexCanaryShadowPairOverlap[];
  kitapAmbariCanaryShadowSamples: BookIndexCanaryShadowSample[];
  sourceHistoryMaturity: BookIndexSourceHistoryMaturity[];
  minimumSourceSuccessfulRunCount: number;
  minimumSourceHistorySpanHours: number;
  leastSuccessfulRunCountSourceCodes: string[];
  shortestHistorySpanSourceCodes: string[];
  leastMatureSourceCodes: string[];
  firstObservationAt: Date | null;
  lastObservationAt: Date | null;
  historySpanHours: number;
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

function historySpanHoursBetween(first: Date | null, last: Date | null) {
  if (!first || !last) return 0;
  return Math.max(
    0,
    Math.round(((last.getTime() - first.getTime()) / 3_600_000) * 10) / 10,
  );
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

  const compositeIndependenceGroupCodes = [...new Set(
    compositeSourceCodes.map((sourceCode) => getBookIndexSourceIndependenceGroup(sourceCode)),
  )].sort((a, b) => a.localeCompare(b, "tr"));

  const [
    externalBookCount,
    matchedExternalBookCount,
    observationRange,
    persistedCompositeLists,
    kitaplarSepetteCanaryList,
    kitaplarSepetteCanaryShadowList,
    kitapStoreCanaryList,
    kitapStoreCanaryShadowList,
    kitapSecGeneralCanaryList,
    kitapSecGeneralCanaryShadowList,
    pandoraCanaryList,
    pandoraCanaryShadowList,
    kitapAmbariCanaryList,
    kitapAmbariCanaryShadowList,
    unmatchedExternalBookGroups,
  ] = await Promise.all([
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
          id: true,
          code: true,
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
                      id: true,
                      sourceKey: true,
                      productUrl: true,
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
      prisma.bookIndexList.findFirst({
        where: { code: "kitaplarsepette-tr-live-canary" },
        select: {
          code: true,
          fetchRuns: {
            orderBy: { startedAt: "desc" },
            take: 1,
            select: {
              status: true,
              startedAt: true,
              completedAt: true,
              itemsFound: true,
              itemsStored: true,
              errorCode: true,
              errorMessage: true,
            },
          },
        },
      }),
      prisma.bookIndexList.findFirst({
        where: { code: "kitaplarsepette-tr-live-canary" },
        select: {
          fetchRuns: {
            where: { status: { in: ["success", "no_change"] } },
            orderBy: { startedAt: "desc" },
            take: 1,
            select: {
              observations: {
                select: {
                  externalBook: {
                    select: {
                      masterBookId: true,
                      title: true,
                      authorName: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.bookIndexList.findFirst({
        where: { code: "kitapstore-tr-live-canary" },
        select: {
          code: true,
          fetchRuns: {
            orderBy: { startedAt: "desc" },
            take: 1,
            select: {
              status: true,
              startedAt: true,
              completedAt: true,
              itemsFound: true,
              itemsStored: true,
              errorCode: true,
              errorMessage: true,
            },
          },
        },
      }),
      prisma.bookIndexList.findFirst({
        where: { code: "kitapstore-tr-live-canary" },
        select: {
          fetchRuns: {
            where: { status: { in: ["success", "no_change"] } },
            orderBy: { startedAt: "desc" },
            take: 1,
            select: {
              observations: {
                select: {
                  externalBook: {
                    select: {
                      masterBookId: true,
                      title: true,
                      authorName: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.bookIndexList.findFirst({
        where: { code: "kitapsec-general-live-canary" },
        select: {
          code: true,
          fetchRuns: {
            orderBy: { startedAt: "desc" },
            take: 1,
            select: {
              status: true,
              startedAt: true,
              completedAt: true,
              itemsFound: true,
              itemsStored: true,
              errorCode: true,
              errorMessage: true,
            },
          },
        },
      }),
      prisma.bookIndexList.findFirst({
        where: { code: "kitapsec-general-live-canary" },
        select: {
          fetchRuns: {
            where: { status: { in: ["success", "no_change"] } },
            orderBy: { startedAt: "desc" },
            take: 1,
            select: {
              observations: {
                select: {
                  externalBook: {
                    select: {
                      masterBookId: true,
                      title: true,
                      authorName: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.bookIndexList.findFirst({
        where: { code: "pandora-tr-live-canary" },
        select: {
          code: true,
          fetchRuns: {
            orderBy: { startedAt: "desc" },
            take: 1,
            select: {
              status: true,
              startedAt: true,
              completedAt: true,
              itemsFound: true,
              itemsStored: true,
              errorCode: true,
              errorMessage: true,
            },
          },
        },
      }),
      prisma.bookIndexList.findFirst({
        where: { code: "pandora-tr-live-canary" },
        select: {
          fetchRuns: {
            where: { status: { in: ["success", "no_change"] } },
            orderBy: { startedAt: "desc" },
            take: 1,
            select: {
              observations: {
                select: {
                  externalBook: {
                    select: {
                      masterBookId: true,
                      title: true,
                      authorName: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.bookIndexList.findFirst({
        where: { code: "kitapambari-tr-live-canary" },
        select: {
          code: true,
          fetchRuns: {
            orderBy: { startedAt: "desc" },
            take: 1,
            select: {
              status: true,
              startedAt: true,
              completedAt: true,
              itemsFound: true,
              itemsStored: true,
              errorCode: true,
              errorMessage: true,
            },
          },
        },
      }),
      prisma.bookIndexList.findFirst({
        where: { code: "kitapambari-tr-live-canary" },
        select: {
          fetchRuns: {
            where: { status: { in: ["success", "no_change"] } },
            orderBy: { startedAt: "desc" },
            take: 1,
            select: {
              observations: {
                select: {
                  externalBook: {
                    select: {
                      masterBookId: true,
                      title: true,
                      authorName: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.bookIndexExternalBook.groupBy({
        by: ["sourceId"],
        where: { matchStatus: "unmatched" },
        _count: { _all: true },
      }),
    ]);

  const unmatchedSourceRows = unmatchedExternalBookGroups.length
    ? await prisma.bookIndexSource.findMany({
        where: {
          id: { in: unmatchedExternalBookGroups.map((group) => group.sourceId) },
        },
        select: {
          id: true,
          code: true,
        },
      })
    : [];
  const sourceCodeById = new Map(
    unmatchedSourceRows.map((source) => [source.id, source.code] as const),
  );
  const unmatchedExternalBooksBySource = unmatchedExternalBookGroups
    .map((group) => ({
      sourceCode: sourceCodeById.get(group.sourceId) ?? group.sourceId,
      count: group._count._all,
    }))
    .sort(
      (a, b) =>
        b.count - a.count || a.sourceCode.localeCompare(b.sourceCode, "tr"),
    );

  const unmatchedMissingAuthorGroups = unmatchedExternalBookGroups.length
    ? await prisma.bookIndexExternalBook.groupBy({
        by: ["sourceId"],
        where: {
          matchStatus: "unmatched",
          normalizedAuthor: null,
          sourceId: {
            in: unmatchedExternalBookGroups.map((group) => group.sourceId),
          },
        },
        _count: { _all: true },
      })
    : [];
  const unmatchedMissingAuthorBooksBySource = unmatchedMissingAuthorGroups
    .map((group) => ({
      sourceCode: sourceCodeById.get(group.sourceId) ?? group.sourceId,
      count: group._count._all,
    }))
    .sort(
      (a, b) =>
        b.count - a.count || a.sourceCode.localeCompare(b.sourceCode, "tr"),
    );
  const unmatchedMissingAuthorWithIsbnGroups = unmatchedMissingAuthorGroups.length
    ? await prisma.bookIndexExternalBook.groupBy({
        by: ["sourceId"],
        where: {
          matchStatus: "unmatched",
          normalizedAuthor: null,
          OR: [
            { isbn13: { not: null } },
            { isbn10: { not: null } },
          ],
          sourceId: {
            in: unmatchedMissingAuthorGroups.map((group) => group.sourceId),
          },
        },
        _count: { _all: true },
      })
    : [];
  const missingAuthorWithIsbnCountBySourceId = new Map(
    unmatchedMissingAuthorWithIsbnGroups.map((group) => [
      group.sourceId,
      group._count._all,
    ] as const),
  );
  const unmatchedMissingAuthorWithIsbnBooksBySource =
    unmatchedMissingAuthorGroups
      .flatMap((group) => {
        const count = missingAuthorWithIsbnCountBySourceId.get(group.sourceId) ?? 0;
        return count
          ? [{
              sourceCode: sourceCodeById.get(group.sourceId) ?? group.sourceId,
              count,
            }]
          : [];
      })
      .sort(
        (a, b) =>
          b.count - a.count || a.sourceCode.localeCompare(b.sourceCode, "tr"),
      );
  const unmatchedMissingAuthorWithoutIsbnBooksBySource =
    unmatchedMissingAuthorGroups
      .flatMap((group) => {
        const withIsbnCount =
          missingAuthorWithIsbnCountBySourceId.get(group.sourceId) ?? 0;
        const count = group._count._all - withIsbnCount;
        return count
          ? [{
              sourceCode: sourceCodeById.get(group.sourceId) ?? group.sourceId,
              count,
            }]
          : [];
      })
      .sort(
        (a, b) =>
          b.count - a.count || a.sourceCode.localeCompare(b.sourceCode, "tr"),
      );
  const unmatchedMissingAuthorRows = unmatchedMissingAuthorGroups.length
    ? await prisma.bookIndexExternalBook.findMany({
        where: {
          matchStatus: "unmatched",
          normalizedAuthor: null,
          sourceId: {
            in: unmatchedMissingAuthorGroups.map((group) => group.sourceId),
          },
        },
        orderBy: [
          { lastSeenAt: "desc" },
          { firstSeenAt: "desc" },
        ],
        take: 20,
        select: {
          sourceId: true,
          sourceKey: true,
          title: true,
          normalizedTitle: true,
          productUrl: true,
          firstSeenAt: true,
          lastSeenAt: true,
        },
      })
    : [];
  const unmatchedMissingAuthorSamples = unmatchedMissingAuthorRows.map((row) => ({
    sourceCode: sourceCodeById.get(row.sourceId) ?? row.sourceId,
    title: row.title,
    normalizedTitle: row.normalizedTitle,
    sourceKey: row.sourceKey,
    productUrl: row.productUrl,
    firstSeenAt: row.firstSeenAt,
    lastSeenAt: row.lastSeenAt,
  })) satisfies BookIndexUnmatchedMissingAuthorSample[];

  const unmatchedNoIsbnAuthorRows = unmatchedExternalBookGroups.length
    ? await prisma.bookIndexExternalBook.findMany({
        where: {
          matchStatus: "unmatched",
          isbn13: null,
          isbn10: null,
          normalizedAuthor: { not: null },
          sourceId: {
            in: unmatchedExternalBookGroups.map((group) => group.sourceId),
          },
        },
        orderBy: [
          { lastSeenAt: "desc" },
          { firstSeenAt: "desc" },
        ],
        select: {
          sourceId: true,
          sourceKey: true,
          title: true,
          authorName: true,
          normalizedTitle: true,
          normalizedAuthor: true,
          firstSeenAt: true,
          lastSeenAt: true,
        },
      })
    : [];
  const unmatchedNoIsbnIdentities = [
    ...new Map(
      unmatchedNoIsbnAuthorRows.flatMap((row) =>
        row.normalizedAuthor
          ? [[
              `${row.normalizedTitle}|${row.normalizedAuthor}`,
              {
                normalizedTitle: row.normalizedTitle,
                normalizedAuthor: row.normalizedAuthor,
              },
            ] as const]
          : [],
      ),
    ).values(),
  ];
  const masterIdentityGroups = unmatchedNoIsbnIdentities.length
    ? await prisma.bookIndexBook.groupBy({
        by: ["normalizedTitle", "normalizedAuthor"],
        where: {
          OR: unmatchedNoIsbnIdentities,
        },
        _count: { _all: true },
      })
    : [];
  const ambiguousMasterCountByIdentity = new Map<string, number>(
    masterIdentityGroups
      .filter((group) => group.normalizedAuthor && group._count._all > 1)
      .map((group) => [
        `${group.normalizedTitle}|${group.normalizedAuthor}`,
        group._count._all,
      ] as const),
  );
  const unmatchedAmbiguousIdentityRows = unmatchedNoIsbnAuthorRows.flatMap((row) => {
    if (!row.normalizedAuthor || !row.authorName) return [];
    const identityKey = `${row.normalizedTitle}|${row.normalizedAuthor}`;
    const masterCandidateCount = ambiguousMasterCountByIdentity.get(identityKey) ?? 0;
    if (masterCandidateCount <= 1) return [];

    return [{
      sourceCode: sourceCodeById.get(row.sourceId) ?? row.sourceId,
      title: row.title,
      authorName: row.authorName,
      normalizedTitle: row.normalizedTitle,
      normalizedAuthor: row.normalizedAuthor,
      sourceKey: row.sourceKey,
      masterCandidateCount,
      firstSeenAt: row.firstSeenAt,
      lastSeenAt: row.lastSeenAt,
    } satisfies BookIndexUnmatchedAmbiguousIdentitySample];
  });
  const unmatchedAmbiguousIdentityKeys = new Set(
    unmatchedAmbiguousIdentityRows.map(
      (row) => `${row.sourceCode}|${row.normalizedTitle}|${row.normalizedAuthor}`,
    ),
  );
  const unmatchedAmbiguousIdentityGroupCount = unmatchedAmbiguousIdentityKeys.size;
  const unmatchedAmbiguousIdentityGroupSetsBySource = new Map<string, Set<string>>();
  for (const row of unmatchedAmbiguousIdentityRows) {
    const identities = unmatchedAmbiguousIdentityGroupSetsBySource.get(row.sourceCode)
      ?? new Set<string>();
    identities.add(`${row.normalizedTitle}|${row.normalizedAuthor}`);
    unmatchedAmbiguousIdentityGroupSetsBySource.set(row.sourceCode, identities);
  }
  const unmatchedAmbiguousIdentityGroupsBySource =
    [...unmatchedAmbiguousIdentityGroupSetsBySource.entries()]
      .map(([sourceCode, identities]) => ({
        sourceCode,
        count: identities.size,
      }))
      .sort(
        (a, b) =>
          b.count - a.count || a.sourceCode.localeCompare(b.sourceCode, "tr"),
      );
  const unmatchedAmbiguousIdentitySamples = unmatchedAmbiguousIdentityRows.slice(0, 20);

  const unmatchedIdentityGroups = unmatchedExternalBookGroups.length
    ? await prisma.bookIndexExternalBook.groupBy({
        by: ["sourceId", "normalizedTitle", "normalizedAuthor"],
        where: {
          matchStatus: "unmatched",
          sourceId: {
            in: unmatchedExternalBookGroups.map((group) => group.sourceId),
          },
        },
        _count: { _all: true },
        _min: { firstSeenAt: true },
        _max: { lastSeenAt: true },
      })
    : [];
  const duplicateUnmatchedIdentityGroups = unmatchedIdentityGroups
    .filter((group) => group._count._all > 1)
    .sort(
      (a, b) =>
        b._count._all - a._count._all
        || (sourceCodeById.get(a.sourceId) ?? a.sourceId).localeCompare(
          sourceCodeById.get(b.sourceId) ?? b.sourceId,
          "tr",
        )
        || a.normalizedTitle.localeCompare(b.normalizedTitle, "tr"),
    );
  const duplicateIdentityGroupsBySourceMap = new Map<string, number>();
  for (const group of duplicateUnmatchedIdentityGroups) {
    const sourceCode = sourceCodeById.get(group.sourceId) ?? group.sourceId;
    duplicateIdentityGroupsBySourceMap.set(
      sourceCode,
      (duplicateIdentityGroupsBySourceMap.get(sourceCode) ?? 0) + 1,
    );
  }
  const unmatchedDuplicateIdentityGroupsBySource =
    [...duplicateIdentityGroupsBySourceMap.entries()]
      .map(([sourceCode, count]) => ({ sourceCode, count }))
      .sort(
        (a, b) =>
          b.count - a.count || a.sourceCode.localeCompare(b.sourceCode, "tr"),
      );

  const duplicateIdentitySampleGroups = duplicateUnmatchedIdentityGroups.slice(0, 12);
  const duplicateIdentityRows = duplicateIdentitySampleGroups.length
    ? await prisma.bookIndexExternalBook.findMany({
        where: {
          matchStatus: "unmatched",
          OR: duplicateIdentitySampleGroups.map((group) => ({
            sourceId: group.sourceId,
            normalizedTitle: group.normalizedTitle,
            normalizedAuthor: group.normalizedAuthor,
          })),
        },
        orderBy: [
          { lastSeenAt: "desc" },
          { firstSeenAt: "asc" },
        ],
        select: {
          sourceId: true,
          sourceKey: true,
          title: true,
          authorName: true,
          normalizedTitle: true,
          normalizedAuthor: true,
          productUrl: true,
          firstSeenAt: true,
          lastSeenAt: true,
        },
      })
    : [];
  const unmatchedDuplicateIdentitySamples =
    duplicateIdentitySampleGroups.map((group) => {
      const rows = duplicateIdentityRows.filter(
        (row) =>
          row.sourceId === group.sourceId
          && row.normalizedTitle === group.normalizedTitle
          && row.normalizedAuthor === group.normalizedAuthor,
      );
      const firstRow = rows[0];

      return {
        sourceCode: sourceCodeById.get(group.sourceId) ?? group.sourceId,
        title: firstRow?.title ?? group.normalizedTitle,
        authorName: firstRow?.authorName ?? group.normalizedAuthor,
        normalizedTitle: group.normalizedTitle,
        normalizedAuthor: group.normalizedAuthor,
        externalRecordCount: group._count._all,
        sourceKeys: [...new Set(rows.map((row) => row.sourceKey))]
          .sort((a, b) => a.localeCompare(b, "tr"))
          .slice(0, 8),
        productUrls: [...new Set(rows.map((row) => row.productUrl))]
          .sort((a, b) => a.localeCompare(b, "tr"))
          .slice(0, 4),
        firstSeenAt: group._min.firstSeenAt ?? null,
        lastSeenAt: group._max.lastSeenAt ?? null,
      } satisfies BookIndexUnmatchedIdentityDuplicateSample;
    });

  const successfulRunStats = persistedCompositeLists.length
    ? await prisma.bookIndexFetchRun.groupBy({
        by: ["listId"],
        where: {
          listId: { in: persistedCompositeLists.map((list) => list.id) },
          status: { in: ["success", "no_change"] },
        },
        _count: { _all: true },
        _min: { startedAt: true },
        _max: { startedAt: true },
      })
    : [];

  const runStatsByListId = new Map(
    successfulRunStats.map((stats) => [stats.listId, stats]),
  );
  const sourceHistoryAccumulator = new Map<string, {
    successfulRunCount: number;
    firstSuccessfulRunAt: Date | null;
    lastSuccessfulRunAt: Date | null;
    listCodes: Set<string>;
  }>();

  for (const list of persistedCompositeLists) {
    const stats = runStatsByListId.get(list.id);
    if (!stats) continue;

    const sourceCode = list.source.code;
    const current = sourceHistoryAccumulator.get(sourceCode) ?? {
      successfulRunCount: 0,
      firstSuccessfulRunAt: null,
      lastSuccessfulRunAt: null,
      listCodes: new Set<string>(),
    };

    current.successfulRunCount += stats._count._all;
    current.listCodes.add(list.code);

    const first = stats._min.startedAt;
    const last = stats._max.startedAt;
    if (first && (!current.firstSuccessfulRunAt || first < current.firstSuccessfulRunAt)) {
      current.firstSuccessfulRunAt = first;
    }
    if (last && (!current.lastSuccessfulRunAt || last > current.lastSuccessfulRunAt)) {
      current.lastSuccessfulRunAt = last;
    }

    sourceHistoryAccumulator.set(sourceCode, current);
  }

  const sourceHistoryMaturity: BookIndexSourceHistoryMaturity[] =
    compositeSourceCodes
      .map((sourceCode) => {
        const maturity = sourceHistoryAccumulator.get(sourceCode);
        const firstSuccessfulRunAt = maturity?.firstSuccessfulRunAt ?? null;
        const lastSuccessfulRunAt = maturity?.lastSuccessfulRunAt ?? null;
        const historySpanHours = historySpanHoursBetween(
          firstSuccessfulRunAt,
          lastSuccessfulRunAt,
        );

        return {
          sourceCode,
          successfulRunCount: maturity?.successfulRunCount ?? 0,
          firstSuccessfulRunAt,
          lastSuccessfulRunAt,
          historySpanHours,
          listCodes: [...(maturity?.listCodes ?? new Set<string>())].sort(
            (a, b) => a.localeCompare(b, "tr"),
          ),
        };
      })
      .sort((a, b) => a.sourceCode.localeCompare(b.sourceCode, "tr"));

  const minimumSourceSuccessfulRunCount = sourceHistoryMaturity.length
    ? Math.min(...sourceHistoryMaturity.map((source) => source.successfulRunCount))
    : 0;
  const minimumSourceHistorySpanHours = sourceHistoryMaturity.length
    ? Math.min(...sourceHistoryMaturity.map((source) => source.historySpanHours))
    : 0;
  const leastSuccessfulRunCountSourceCodes = sourceHistoryMaturity
    .filter(
      (source) =>
        source.successfulRunCount === minimumSourceSuccessfulRunCount,
    )
    .map((source) => source.sourceCode)
    .sort((a, b) => a.localeCompare(b, "tr"));
  const shortestHistorySpanSourceCodes = sourceHistoryMaturity
    .filter(
      (source) =>
        source.historySpanHours === minimumSourceHistorySpanHours,
    )
    .map((source) => source.sourceCode)
    .sort((a, b) => a.localeCompare(b, "tr"));
  const leastMatureSourceCodes = [...new Set([
    ...leastSuccessfulRunCountSourceCodes,
    ...shortestHistorySpanSourceCodes,
  ])].sort((a, b) => a.localeCompare(b, "tr"));

  const observedCompositeSourceCodes = [...new Set(
    persistedCompositeLists
      .filter((list) => list.fetchRuns.length > 0)
      .map((list) => list.source.code),
  )].sort((a, b) => a.localeCompare(b, "tr"));

  const observedCompositeIndependenceGroupCodes = [...new Set(
    observedCompositeSourceCodes.map(
      (sourceCode) => getBookIndexSourceIndependenceGroup(sourceCode),
    ),
  )].sort((a, b) => a.localeCompare(b, "tr"));

  const observedSourcesByIndependenceGroup = new Map<string, Set<string>>();
  for (const sourceCode of observedCompositeSourceCodes) {
    const independenceGroup = getBookIndexSourceIndependenceGroup(sourceCode);
    const sourceCodes =
      observedSourcesByIndependenceGroup.get(independenceGroup) ?? new Set<string>();
    sourceCodes.add(sourceCode);
    observedSourcesByIndependenceGroup.set(independenceGroup, sourceCodes);
  }
  const sharedOperatorGroups = [...observedSourcesByIndependenceGroup.entries()]
    .filter(([, sourceCodes]) => sourceCodes.size > 1)
    .map(([independenceGroup, sourceCodes]) => ({
      independenceGroup,
      operatorName: getBookIndexSourceOperatorName([...sourceCodes][0]),
      sourceCodes: [...sourceCodes].sort((a, b) => a.localeCompare(b, "tr")),
    }))
    .sort((a, b) => a.independenceGroup.localeCompare(b.independenceGroup, "tr"));

  const latestCompositeExternalBooks = new Map<string, {
    sourceCode: string;
    sourceKey: string;
    title: string;
    authorName: string | null;
    isbn13: string | null;
    isbn10: string | null;
    productUrl: string;
    matched: boolean;
  }>();
  const sourceCodesByMasterBook = new Map<string, Set<string>>();
  const masterBookDetails = new Map<string, {
    title: string;
    authorName: string | null;
    normalizedTitle: string;
    normalizedAuthor: string | null;
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

      latestCompositeExternalBooks.set(book.id, {
        sourceCode: list.source.code,
        sourceKey: book.sourceKey,
        title: book.title,
        authorName: book.authorName,
        isbn13: book.isbn13,
        isbn10: book.isbn10,
        productUrl: book.productUrl,
        matched: Boolean(book.masterBookId),
      });

      if (book.masterBookId) {
        const sourceCodes = sourceCodesByMasterBook.get(book.masterBookId) ?? new Set<string>();
        sourceCodes.add(list.source.code);
        sourceCodesByMasterBook.set(book.masterBookId, sourceCodes);

        const detail = masterBookDetails.get(book.masterBookId) ?? {
          title: book.title,
          authorName: book.authorName,
          normalizedTitle: book.normalizedTitle,
          normalizedAuthor: book.normalizedAuthor,
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

  const latestCompositeBookValues = [...latestCompositeExternalBooks.values()];
  const latestCompositeExternalBookCount = latestCompositeBookValues.length;
  const latestCompositeMatchedExternalBookCount =
    latestCompositeBookValues.filter((book) => book.matched).length;
  const latestCompositeUnmatchedExternalBookCount =
    latestCompositeExternalBookCount - latestCompositeMatchedExternalBookCount;
  const latestCompositeUnmatchedBySourceMap = new Map<string, number>();

  for (const book of latestCompositeBookValues) {
    if (book.matched) continue;
    latestCompositeUnmatchedBySourceMap.set(
      book.sourceCode,
      (latestCompositeUnmatchedBySourceMap.get(book.sourceCode) ?? 0) + 1,
    );
  }

  const latestCompositeUnmatchedBooksBySource =
    [...latestCompositeUnmatchedBySourceMap.entries()]
      .map(([sourceCode, count]) => ({ sourceCode, count }))
      .sort(
        (a, b) =>
          b.count - a.count || a.sourceCode.localeCompare(b.sourceCode, "tr"),
      );
  const latestCompositeUnmatchedSamples = latestCompositeBookValues
    .filter((book) => !book.matched)
    .sort(
      (a, b) =>
        a.sourceCode.localeCompare(b.sourceCode, "tr")
        || a.title.localeCompare(b.title, "tr"),
    )
    .slice(0, 30)
    .map(({ matched: _matched, ...book }) => book);
  const latestCompositeMatchCoveragePercent = latestCompositeExternalBookCount
    ? Math.round(
        (latestCompositeMatchedExternalBookCount / latestCompositeExternalBookCount)
          * 1000,
      ) / 10
    : 0;

  const compositeSourceCounts = [...sourceCodesByMasterBook.values()].map((sourceCodes) => sourceCodes.size);
  const independentCompositeSourceCounts = [...sourceCodesByMasterBook.values()].map(
    (sourceCodes) =>
      new Set(
        [...sourceCodes].map(
          (sourceCode) => getBookIndexSourceIndependenceGroup(sourceCode),
        ),
      ).size,
  );
  const storefrontEligibleButOperatorIneligible = [...masterBookDetails.entries()]
    .map(([masterBookId, detail]) => {
      const sourceCodes = [...detail.sourceCodes].sort((a, b) => a.localeCompare(b, "tr"));
      const independenceGroups = [...new Set(
        sourceCodes.map(
          (sourceCode) => getBookIndexSourceIndependenceGroup(sourceCode),
        ),
      )].sort((a, b) => a.localeCompare(b, "tr"));

      return {
        masterBookId,
        title: detail.title,
        authorName: detail.authorName,
        sourceCodes,
        independenceGroups,
        storefrontSourceCount: sourceCodes.length,
        independentSourceCount: independenceGroups.length,
      };
    })
    .filter(
      (sample) =>
        sample.storefrontSourceCount >= 3
        && sample.independentSourceCount < 3,
    )
    .sort(
      (a, b) =>
        b.storefrontSourceCount - a.storefrontSourceCount
        || b.independentSourceCount - a.independentSourceCount
        || a.title.localeCompare(b.title, "tr")
        || a.masterBookId.localeCompare(b.masterBookId),
    );

  const sourcePairOverlapMatrix: BookIndexSourcePairOverlap[] = [];
  for (let leftIndex = 0; leftIndex < observedCompositeSourceCodes.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < observedCompositeSourceCodes.length;
      rightIndex += 1
    ) {
      const sourceCodeA = observedCompositeSourceCodes[leftIndex];
      const sourceCodeB = observedCompositeSourceCodes[rightIndex];
      const independenceGroupA = getBookIndexSourceIndependenceGroup(sourceCodeA);
      const independenceGroupB = getBookIndexSourceIndependenceGroup(sourceCodeB);
      const sharedBookCount = [...sourceCodesByMasterBook.values()].filter(
        (sourceCodes) => sourceCodes.has(sourceCodeA) && sourceCodes.has(sourceCodeB),
      ).length;
      sourcePairOverlapMatrix.push({
        sourceCodeA,
        sourceCodeB,
        independenceGroupA,
        independenceGroupB,
        sameIndependenceGroup: independenceGroupA === independenceGroupB,
        sharedBookCount,
      });
    }
  }

  const nearThreeSourceCandidates = [...masterBookDetails.entries()]
    .filter(([, detail]) => detail.sourceCodes.size === 2)
    .map(([masterBookId, detail]) => ({
      masterBookId,
      title: detail.title,
      authorName: detail.authorName,
      normalizedTitle: detail.normalizedTitle,
      normalizedAuthor: detail.normalizedAuthor,
      isbn13s: [...detail.isbn13s].sort(),
      sourceCodes: [...detail.sourceCodes].sort((a, b) => a.localeCompare(b, "tr")),
      independenceGroups: [...new Set(
        [...detail.sourceCodes].map(
          (sourceCode) => getBookIndexSourceIndependenceGroup(sourceCode),
        ),
      )].sort((a, b) => a.localeCompare(b, "tr")),
      absentObservedSourceCodes: observedCompositeSourceCodes.filter(
        (sourceCode) => !detail.sourceCodes.has(sourceCode),
      ),
    }))
    .sort(
      (a, b) =>
        a.title.localeCompare(b.title, "tr")
        || a.masterBookId.localeCompare(b.masterBookId),
    );

  const nearThreeHistoryWhere = nearThreeSourceCandidates.flatMap((candidate) => [
    { masterBookId: candidate.masterBookId },
    ...(candidate.isbn13s.length > 0 ? [{ isbn13: { in: candidate.isbn13s } }] : []),
    ...(candidate.normalizedAuthor
      ? [{
          normalizedTitle: candidate.normalizedTitle,
          normalizedAuthor: candidate.normalizedAuthor,
        }]
      : []),
  ]);

  const nearThreeHistoricalBooks = nearThreeHistoryWhere.length > 0
    ? await prisma.bookIndexExternalBook.findMany({
        where: { OR: nearThreeHistoryWhere },
        select: {
          masterBookId: true,
          isbn13: true,
          normalizedTitle: true,
          normalizedAuthor: true,
          source: { select: { code: true } },
          observations: {
            select: {
              observedAt: true,
              fetchRun: {
                select: {
                  list: {
                    select: {
                      code: true,
                      period: true,
                    },
                  },
                },
              },
            },
          },
        },
      })
    : [];

  const nearThreeSourceSamples = nearThreeSourceCandidates.slice(0, 20).map((candidate) => {
    type EvidenceAccumulator = {
      sourceCode: string;
      matchedBy: BookIndexNearThreeHistoricalEvidence["matchedBy"];
      listCodes: Set<string>;
      periods: Set<string>;
      firstObservedAt: Date;
      lastObservedAt: Date;
    };

    const evidenceBySource = new Map<string, EvidenceAccumulator>();
    const matchPriority: Record<BookIndexNearThreeHistoricalEvidence["matchedBy"], number> = {
      master_book: 3,
      isbn13: 2,
      normalized_identity: 1,
    };

    for (const book of nearThreeHistoricalBooks) {
      const sourceCode = book.source.code;
      if (!candidate.absentObservedSourceCodes.includes(sourceCode)) continue;
      if (book.observations.length === 0) continue;

      let matchedBy: BookIndexNearThreeHistoricalEvidence["matchedBy"] | null = null;
      if (book.masterBookId === candidate.masterBookId) {
        matchedBy = "master_book";
      } else if (book.isbn13 && candidate.isbn13s.includes(book.isbn13)) {
        matchedBy = "isbn13";
      } else if (
        candidate.normalizedAuthor
        && book.normalizedTitle === candidate.normalizedTitle
        && book.normalizedAuthor === candidate.normalizedAuthor
      ) {
        matchedBy = "normalized_identity";
      }

      if (!matchedBy) continue;

      const observedTimes = book.observations.map((observation) => observation.observedAt);
      const firstObservedAt = new Date(
        Math.min(...observedTimes.map((value) => value.getTime())),
      );
      const lastObservedAt = new Date(
        Math.max(...observedTimes.map((value) => value.getTime())),
      );
      const existing = evidenceBySource.get(sourceCode) ?? {
        sourceCode,
        matchedBy,
        listCodes: new Set<string>(),
        periods: new Set<string>(),
        firstObservedAt,
        lastObservedAt,
      };

      if (matchPriority[matchedBy] > matchPriority[existing.matchedBy]) {
        existing.matchedBy = matchedBy;
      }
      if (firstObservedAt < existing.firstObservedAt) {
        existing.firstObservedAt = firstObservedAt;
      }
      if (lastObservedAt > existing.lastObservedAt) {
        existing.lastObservedAt = lastObservedAt;
      }

      for (const observation of book.observations) {
        existing.listCodes.add(observation.fetchRun.list.code);
        existing.periods.add(observation.fetchRun.list.period);
      }
      evidenceBySource.set(sourceCode, existing);
    }

    const historicalThirdSourceEvidence = [...evidenceBySource.values()]
      .sort((a, b) => a.sourceCode.localeCompare(b.sourceCode, "tr"))
      .map((evidence) => ({
        sourceCode: evidence.sourceCode,
        matchedBy: evidence.matchedBy,
        listCodes: [...evidence.listCodes].sort((a, b) => a.localeCompare(b, "tr")),
        periods: [...evidence.periods].sort((a, b) => a.localeCompare(b, "tr")),
        firstObservedAt: evidence.firstObservedAt,
        lastObservedAt: evidence.lastObservedAt,
      }));

    return {
      masterBookId: candidate.masterBookId,
      title: candidate.title,
      authorName: candidate.authorName,
      isbn13s: candidate.isbn13s,
      sourceCodes: candidate.sourceCodes,
      independenceGroups: candidate.independenceGroups,
      independentSourceCount: candidate.independenceGroups.length,
      absentObservedSourceCodes: candidate.absentObservedSourceCodes,
      historicalThirdSourceCodes: historicalThirdSourceEvidence.map(
        (evidence) => evidence.sourceCode,
      ),
      historicalThirdSourceEvidence,
    };
  });

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

  const latestKitaplarSepetteCanaryShadowRun =
    kitaplarSepetteCanaryShadowList?.fetchRuns[0] ?? null;
  const kitaplarSepetteCanaryShadowBooks = new Map<string, {
    title: string;
    authorName: string | null;
  }>();

  for (const observation of latestKitaplarSepetteCanaryShadowRun?.observations ?? []) {
    const book = observation.externalBook;
    if (!book.masterBookId) continue;
    if (!kitaplarSepetteCanaryShadowBooks.has(book.masterBookId)) {
      kitaplarSepetteCanaryShadowBooks.set(book.masterBookId, {
        title: book.title,
        authorName: book.authorName,
      });
    }
  }

  const kitaplarSepetteIndependenceGroup =
    getBookIndexSourceIndependenceGroup("kitaplarsepette");
  const kitaplarSepetteCanaryShadowSamples = [...kitaplarSepetteCanaryShadowBooks.entries()]
    .map(([masterBookId, book]) => {
      const currentSourceCodes = [
        ...(sourceCodesByMasterBook.get(masterBookId) ?? new Set<string>()),
      ]
        .filter((sourceCode) => sourceCode !== "kitaplarsepette")
        .sort((a, b) => a.localeCompare(b, "tr"));
      const currentIndependenceGroups = [...new Set(
        currentSourceCodes.map(
          (sourceCode) => getBookIndexSourceIndependenceGroup(sourceCode),
        ),
      )].sort((a, b) => a.localeCompare(b, "tr"));
      const projectedIndependenceGroups = new Set([
        ...currentIndependenceGroups,
        kitaplarSepetteIndependenceGroup,
      ]);

      return {
        masterBookId,
        title: book.title,
        authorName: book.authorName,
        currentSourceCodes,
        currentIndependenceGroups,
        projectedStorefrontSourceCount: new Set([
          ...currentSourceCodes,
          "kitaplarsepette",
        ]).size,
        projectedIndependentSourceCount: projectedIndependenceGroups.size,
      };
    })
    .sort(
      (a, b) =>
        b.currentSourceCodes.length - a.currentSourceCodes.length
        || a.title.localeCompare(b.title, "tr")
        || a.masterBookId.localeCompare(b.masterBookId),
    );

  const kitaplarSepetteCanaryShadowPairOverlap =
    observedCompositeSourceCodes
      .filter((sourceCode) => sourceCode !== "kitaplarsepette")
      .map((sourceCode) => ({
        sourceCode,
        sharedBookCount: kitaplarSepetteCanaryShadowSamples.filter(
          (sample) => sample.currentSourceCodes.includes(sourceCode),
        ).length,
      }));

  const firstObservationAt = observationRange._min.observedAt ?? null;
  const lastObservationAt = observationRange._max.observedAt ?? null;
  const unmatchedExternalBookCount = externalBookCount - matchedExternalBookCount;
  const latestKitaplarSepetteCanaryRun = kitaplarSepetteCanaryList?.fetchRuns[0] ?? null;
  const kitaplarSepetteCanaryHealth: BookIndexCanaryHealth = {
    listCode: "kitaplarsepette-tr-live-canary",
    found: Boolean(kitaplarSepetteCanaryList),
    latestStatus: latestKitaplarSepetteCanaryRun?.status ?? null,
    startedAt: latestKitaplarSepetteCanaryRun?.startedAt ?? null,
    completedAt: latestKitaplarSepetteCanaryRun?.completedAt ?? null,
    itemsFound: latestKitaplarSepetteCanaryRun?.itemsFound ?? null,
    itemsStored: latestKitaplarSepetteCanaryRun?.itemsStored ?? null,
    errorCode: latestKitaplarSepetteCanaryRun?.errorCode ?? null,
    errorMessage: latestKitaplarSepetteCanaryRun?.errorMessage ?? null,
  };

  // Read-only shadow qualification evidence; this never promotes KitapStore into the composite.
  const latestKitapStoreCanaryShadowRun =
    kitapStoreCanaryShadowList?.fetchRuns[0] ?? null;
  const kitapStoreCanaryShadowBooks = new Map<string, {
    title: string;
    authorName: string | null;
  }>();

  for (const observation of latestKitapStoreCanaryShadowRun?.observations ?? []) {
    const book = observation.externalBook;
    if (!book.masterBookId) continue;
    if (!kitapStoreCanaryShadowBooks.has(book.masterBookId)) {
      kitapStoreCanaryShadowBooks.set(book.masterBookId, {
        title: book.title,
        authorName: book.authorName,
      });
    }
  }

  const kitapStoreCanaryObservationCount =
    latestKitapStoreCanaryShadowRun?.observations.length ?? 0;
  const kitapStoreCanaryMatchedObservationCount =
    latestKitapStoreCanaryShadowRun?.observations.filter(
      (observation) => Boolean(observation.externalBook.masterBookId),
    ).length ?? 0;
  const kitapStoreCanaryUnmatchedObservationCount =
    kitapStoreCanaryObservationCount - kitapStoreCanaryMatchedObservationCount;
  const kitapStoreCanaryDuplicateMasterObservationCount =
    kitapStoreCanaryMatchedObservationCount - kitapStoreCanaryShadowBooks.size;

  const kitapStoreIndependenceGroup =
    getBookIndexSourceIndependenceGroup("kitapstore");
  const kitapStoreCanaryShadowSamples = [...kitapStoreCanaryShadowBooks.entries()]
    .map(([masterBookId, book]) => {
      const currentSourceCodes = [
        ...(sourceCodesByMasterBook.get(masterBookId) ?? new Set<string>()),
      ]
        .filter((sourceCode) => sourceCode !== "kitapstore")
        .sort((a, b) => a.localeCompare(b, "tr"));
      const currentIndependenceGroups = [...new Set(
        currentSourceCodes.map(
          (sourceCode) => getBookIndexSourceIndependenceGroup(sourceCode),
        ),
      )].sort((a, b) => a.localeCompare(b, "tr"));
      const projectedIndependenceGroups = new Set([
        ...currentIndependenceGroups,
        kitapStoreIndependenceGroup,
      ]);

      return {
        masterBookId,
        title: book.title,
        authorName: book.authorName,
        currentSourceCodes,
        currentIndependenceGroups,
        projectedStorefrontSourceCount: new Set([
          ...currentSourceCodes,
          "kitapstore",
        ]).size,
        projectedIndependentSourceCount: projectedIndependenceGroups.size,
      };
    })
    .sort(
      (a, b) =>
        b.currentSourceCodes.length - a.currentSourceCodes.length
        || a.title.localeCompare(b.title, "tr")
        || a.masterBookId.localeCompare(b.masterBookId),
    );

  const kitapStoreCanaryShadowPairOverlap =
    observedCompositeSourceCodes
      .filter((sourceCode) => sourceCode !== "kitapstore")
      .map((sourceCode) => ({
        sourceCode,
        sharedBookCount: kitapStoreCanaryShadowSamples.filter(
          (sample) => sample.currentSourceCodes.includes(sourceCode),
        ).length,
      }));

  const latestKitapStoreCanaryRun = kitapStoreCanaryList?.fetchRuns[0] ?? null;
  const kitapStoreCanaryHealth: BookIndexCanaryHealth = {
    listCode: "kitapstore-tr-live-canary",
    found: Boolean(kitapStoreCanaryList),
    latestStatus: latestKitapStoreCanaryRun?.status ?? null,
    startedAt: latestKitapStoreCanaryRun?.startedAt ?? null,
    completedAt: latestKitapStoreCanaryRun?.completedAt ?? null,
    itemsFound: latestKitapStoreCanaryRun?.itemsFound ?? null,
    itemsStored: latestKitapStoreCanaryRun?.itemsStored ?? null,
    errorCode: latestKitapStoreCanaryRun?.errorCode ?? null,
    errorMessage: latestKitapStoreCanaryRun?.errorMessage ?? null,
  };

  const latestKitapSecGeneralCanaryShadowRun =
    kitapSecGeneralCanaryShadowList?.fetchRuns[0] ?? null;
  const kitapSecGeneralCanaryShadowBooks = new Map<string, {
    title: string;
    authorName: string | null;
  }>();

  for (const observation of latestKitapSecGeneralCanaryShadowRun?.observations ?? []) {
    const book = observation.externalBook;
    if (!book.masterBookId) continue;
    if (!kitapSecGeneralCanaryShadowBooks.has(book.masterBookId)) {
      kitapSecGeneralCanaryShadowBooks.set(book.masterBookId, {
        title: book.title,
        authorName: book.authorName,
      });
    }
  }

  const kitapSecIndependenceGroup =
    getBookIndexSourceIndependenceGroup("kitapsec");
  const kitapSecGeneralCanaryShadowSamples =
    [...kitapSecGeneralCanaryShadowBooks.entries()]
      .map(([masterBookId, book]) => {
        const currentSourceCodes = [
          ...(sourceCodesByMasterBook.get(masterBookId) ?? new Set<string>()),
        ]
          .filter((sourceCode) => sourceCode !== "kitapsec")
          .sort((a, b) => a.localeCompare(b, "tr"));
        const currentIndependenceGroups = [...new Set(
          currentSourceCodes.map(
            (sourceCode) => getBookIndexSourceIndependenceGroup(sourceCode),
          ),
        )].sort((a, b) => a.localeCompare(b, "tr"));
        const projectedIndependenceGroups = new Set([
          ...currentIndependenceGroups,
          kitapSecIndependenceGroup,
        ]);

        return {
          masterBookId,
          title: book.title,
          authorName: book.authorName,
          currentSourceCodes,
          currentIndependenceGroups,
          projectedStorefrontSourceCount: new Set([
            ...currentSourceCodes,
            "kitapsec",
          ]).size,
          projectedIndependentSourceCount: projectedIndependenceGroups.size,
        };
      })
      .sort(
        (a, b) =>
          b.currentSourceCodes.length - a.currentSourceCodes.length
          || a.title.localeCompare(b.title, "tr")
          || a.masterBookId.localeCompare(b.masterBookId),
      );

  const kitapSecGeneralCanaryShadowPairOverlap =
    observedCompositeSourceCodes
      .filter((sourceCode) => sourceCode !== "kitapsec")
      .map((sourceCode) => ({
        sourceCode,
        sharedBookCount: kitapSecGeneralCanaryShadowSamples.filter(
          (sample) => sample.currentSourceCodes.includes(sourceCode),
        ).length,
      }));

  const latestKitapSecGeneralCanaryRun =
    kitapSecGeneralCanaryList?.fetchRuns[0] ?? null;
  const kitapSecGeneralCanaryHealth: BookIndexCanaryHealth = {
    listCode: "kitapsec-general-live-canary",
    found: Boolean(kitapSecGeneralCanaryList),
    latestStatus: latestKitapSecGeneralCanaryRun?.status ?? null,
    startedAt: latestKitapSecGeneralCanaryRun?.startedAt ?? null,
    completedAt: latestKitapSecGeneralCanaryRun?.completedAt ?? null,
    itemsFound: latestKitapSecGeneralCanaryRun?.itemsFound ?? null,
    itemsStored: latestKitapSecGeneralCanaryRun?.itemsStored ?? null,
    errorCode: latestKitapSecGeneralCanaryRun?.errorCode ?? null,
    errorMessage: latestKitapSecGeneralCanaryRun?.errorMessage ?? null,
  };

  const latestPandoraCanaryShadowRun =
    pandoraCanaryShadowList?.fetchRuns[0] ?? null;
  const pandoraCanaryShadowBooks = new Map<string, {
    title: string;
    authorName: string | null;
  }>();

  for (const observation of latestPandoraCanaryShadowRun?.observations ?? []) {
    const book = observation.externalBook;
    if (!book.masterBookId) continue;
    if (!pandoraCanaryShadowBooks.has(book.masterBookId)) {
      pandoraCanaryShadowBooks.set(book.masterBookId, {
        title: book.title,
        authorName: book.authorName,
      });
    }
  }

  const pandoraIndependenceGroup =
    getBookIndexSourceIndependenceGroup("pandora");
  const pandoraCanaryShadowSamples = [...pandoraCanaryShadowBooks.entries()]
    .map(([masterBookId, book]) => {
      const currentSourceCodes = [
        ...(sourceCodesByMasterBook.get(masterBookId) ?? new Set<string>()),
      ]
        .filter((sourceCode) => sourceCode !== "pandora")
        .sort((a, b) => a.localeCompare(b, "tr"));
      const currentIndependenceGroups = [...new Set(
        currentSourceCodes.map(
          (sourceCode) => getBookIndexSourceIndependenceGroup(sourceCode),
        ),
      )].sort((a, b) => a.localeCompare(b, "tr"));
      const projectedIndependenceGroups = new Set([
        ...currentIndependenceGroups,
        pandoraIndependenceGroup,
      ]);

      return {
        masterBookId,
        title: book.title,
        authorName: book.authorName,
        currentSourceCodes,
        currentIndependenceGroups,
        projectedStorefrontSourceCount: new Set([
          ...currentSourceCodes,
          "pandora",
        ]).size,
        projectedIndependentSourceCount: projectedIndependenceGroups.size,
      };
    })
    .sort(
      (a, b) =>
        b.currentSourceCodes.length - a.currentSourceCodes.length
        || a.title.localeCompare(b.title, "tr")
        || a.masterBookId.localeCompare(b.masterBookId),
    );

  const pandoraCanaryShadowPairOverlap =
    observedCompositeSourceCodes
      .filter((sourceCode) => sourceCode !== "pandora")
      .map((sourceCode) => ({
        sourceCode,
        sharedBookCount: pandoraCanaryShadowSamples.filter(
          (sample) => sample.currentSourceCodes.includes(sourceCode),
        ).length,
      }));

  const latestPandoraCanaryRun = pandoraCanaryList?.fetchRuns[0] ?? null;
  const pandoraCanaryHealth: BookIndexCanaryHealth = {
    listCode: "pandora-tr-live-canary",
    found: Boolean(pandoraCanaryList),
    latestStatus: latestPandoraCanaryRun?.status ?? null,
    startedAt: latestPandoraCanaryRun?.startedAt ?? null,
    completedAt: latestPandoraCanaryRun?.completedAt ?? null,
    itemsFound: latestPandoraCanaryRun?.itemsFound ?? null,
    itemsStored: latestPandoraCanaryRun?.itemsStored ?? null,
    errorCode: latestPandoraCanaryRun?.errorCode ?? null,
    errorMessage: latestPandoraCanaryRun?.errorMessage ?? null,
  };

  const latestKitapAmbariCanaryShadowRun =
    kitapAmbariCanaryShadowList?.fetchRuns[0] ?? null;
  const kitapAmbariCanaryShadowBooks = new Map<string, {
    title: string;
    authorName: string | null;
  }>();

  for (const observation of latestKitapAmbariCanaryShadowRun?.observations ?? []) {
    const book = observation.externalBook;
    if (!book.masterBookId) continue;
    if (!kitapAmbariCanaryShadowBooks.has(book.masterBookId)) {
      kitapAmbariCanaryShadowBooks.set(book.masterBookId, {
        title: book.title,
        authorName: book.authorName,
      });
    }
  }

  const kitapAmbariIndependenceGroup =
    getBookIndexSourceIndependenceGroup("kitapambari");
  const kitapAmbariCanaryShadowSamples = [...kitapAmbariCanaryShadowBooks.entries()]
    .map(([masterBookId, book]) => {
      const currentSourceCodes = [
        ...(sourceCodesByMasterBook.get(masterBookId) ?? new Set<string>()),
      ]
        .filter((sourceCode) => sourceCode !== "kitapambari")
        .sort((a, b) => a.localeCompare(b, "tr"));
      const currentIndependenceGroups = [...new Set(
        currentSourceCodes.map(
          (sourceCode) => getBookIndexSourceIndependenceGroup(sourceCode),
        ),
      )].sort((a, b) => a.localeCompare(b, "tr"));
      const projectedIndependenceGroups = new Set([
        ...currentIndependenceGroups,
        kitapAmbariIndependenceGroup,
      ]);

      return {
        masterBookId,
        title: book.title,
        authorName: book.authorName,
        currentSourceCodes,
        currentIndependenceGroups,
        projectedStorefrontSourceCount: new Set([
          ...currentSourceCodes,
          "kitapambari",
        ]).size,
        projectedIndependentSourceCount: projectedIndependenceGroups.size,
      };
    })
    .sort(
      (a, b) =>
        b.currentSourceCodes.length - a.currentSourceCodes.length
        || a.title.localeCompare(b.title, "tr")
        || a.masterBookId.localeCompare(b.masterBookId),
    );

  const kitapAmbariCanaryShadowPairOverlap =
    observedCompositeSourceCodes
      .filter((sourceCode) => sourceCode !== "kitapambari")
      .map((sourceCode) => ({
        sourceCode,
        sharedBookCount: kitapAmbariCanaryShadowSamples.filter(
          (sample) => sample.currentSourceCodes.includes(sourceCode),
        ).length,
      }));

  const latestKitapAmbariCanaryRun =
    kitapAmbariCanaryList?.fetchRuns[0] ?? null;
  const kitapAmbariCanaryHealth: BookIndexCanaryHealth = {
    listCode: "kitapambari-tr-live-canary",
    found: Boolean(kitapAmbariCanaryList),
    latestStatus: latestKitapAmbariCanaryRun?.status ?? null,
    startedAt: latestKitapAmbariCanaryRun?.startedAt ?? null,
    completedAt: latestKitapAmbariCanaryRun?.completedAt ?? null,
    itemsFound: latestKitapAmbariCanaryRun?.itemsFound ?? null,
    itemsStored: latestKitapAmbariCanaryRun?.itemsStored ?? null,
    errorCode: latestKitapAmbariCanaryRun?.errorCode ?? null,
    errorMessage: latestKitapAmbariCanaryRun?.errorMessage ?? null,
  };

  return {
    compositeSourceTarget: compositeSourceCodes.length,
    compositeIndependenceGroupTarget: compositeIndependenceGroupCodes.length,
    observedCompositeSources: observedCompositeSourceCodes.length,
    observedCompositeSourceCodes,
    observedCompositeIndependenceGroups: observedCompositeIndependenceGroupCodes.length,
    observedCompositeIndependenceGroupCodes,
    sharedOperatorGroupCount: sharedOperatorGroups.length,
    sharedOperatorGroups,
    externalBookCount,
    matchedExternalBookCount,
    unmatchedExternalBookCount,
    unmatchedExternalBooksBySource,
    unmatchedDuplicateIdentityGroupCount: duplicateUnmatchedIdentityGroups.length,
    unmatchedDuplicateIdentityGroupsBySource,
    unmatchedDuplicateIdentitySamples,
    unmatchedMissingAuthorBooksBySource,
    unmatchedMissingAuthorWithIsbnBooksBySource,
    unmatchedMissingAuthorWithoutIsbnBooksBySource,
    unmatchedMissingAuthorSamples,
    unmatchedAmbiguousIdentityGroupCount,
    unmatchedAmbiguousIdentityGroupsBySource,
    unmatchedAmbiguousIdentitySamples,
    matchCoveragePercent: externalBookCount
      ? Math.round((matchedExternalBookCount / externalBookCount) * 1000) / 10
      : 0,
    latestCompositeExternalBookCount,
    latestCompositeMatchedExternalBookCount,
    latestCompositeUnmatchedExternalBookCount,
    latestCompositeUnmatchedBooksBySource,
    latestCompositeUnmatchedSamples,
    latestCompositeMatchCoveragePercent,
    maxCompositeSourcesPerBook: compositeSourceCounts.length ? Math.max(...compositeSourceCounts) : 0,
    booksOnAtLeast2CompositeSources: compositeSourceCounts.filter((count) => count >= 2).length,
    booksOnAtLeast3CompositeSources: compositeSourceCounts.filter((count) => count >= 3).length,
    maxIndependentCompositeSourcesPerBook: independentCompositeSourceCounts.length
      ? Math.max(...independentCompositeSourceCounts)
      : 0,
    booksOnAtLeast2IndependentCompositeSources: independentCompositeSourceCounts.filter(
      (count) => count >= 2,
    ).length,
    booksOnAtLeast3IndependentCompositeSources: independentCompositeSourceCounts.filter(
      (count) => count >= 3,
    ).length,
    storefrontEligibleButOperatorIneligibleCount:
      storefrontEligibleButOperatorIneligible.length,
    storefrontEligibleButOperatorIneligibleSamples:
      storefrontEligibleButOperatorIneligible.slice(0, 20),
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
    nearThreeWithHistoricalThirdSourceCount: nearThreeSourceSamples.filter(
      (sample) => sample.historicalThirdSourceCodes.length > 0,
    ).length,
    nearThreeSourceSamples,
    kitaplarSepetteCanaryHealth,
    kitaplarSepetteCanaryShadowBookCount: kitaplarSepetteCanaryShadowSamples.length,
    kitaplarSepetteCanaryShadowOverlapWithCompositeCount:
      kitaplarSepetteCanaryShadowSamples.filter(
        (sample) => sample.currentSourceCodes.length >= 1,
      ).length,
    kitaplarSepetteCanaryShadowWouldReach3StorefrontCount:
      kitaplarSepetteCanaryShadowSamples.filter(
        (sample) => sample.projectedStorefrontSourceCount >= 3,
      ).length,
    kitaplarSepetteCanaryShadowWouldReach3IndependentCount:
      kitaplarSepetteCanaryShadowSamples.filter(
        (sample) => sample.projectedIndependentSourceCount >= 3,
      ).length,
    kitaplarSepetteCanaryShadowPairOverlap,
    kitaplarSepetteCanaryShadowSamples:
      kitaplarSepetteCanaryShadowSamples
        .filter((sample) => sample.currentSourceCodes.length > 0)
        .slice(0, 20),
    kitapStoreCanaryHealth,
    kitapStoreCanaryObservationCount,
    kitapStoreCanaryMatchedObservationCount,
    kitapStoreCanaryUnmatchedObservationCount,
    kitapStoreCanaryDuplicateMasterObservationCount,
    kitapStoreCanaryShadowBookCount: kitapStoreCanaryShadowSamples.length,
    kitapStoreCanaryShadowOverlapWithCompositeCount:
      kitapStoreCanaryShadowSamples.filter(
        (sample) => sample.currentSourceCodes.length >= 1,
      ).length,
    kitapStoreCanaryShadowWouldReach3StorefrontCount:
      kitapStoreCanaryShadowSamples.filter(
        (sample) => sample.projectedStorefrontSourceCount >= 3,
      ).length,
    kitapStoreCanaryShadowWouldReach3IndependentCount:
      kitapStoreCanaryShadowSamples.filter(
        (sample) => sample.projectedIndependentSourceCount >= 3,
      ).length,
    kitapStoreCanaryShadowPairOverlap,
    kitapStoreCanaryShadowSamples:
      kitapStoreCanaryShadowSamples
        .filter((sample) => sample.currentSourceCodes.length > 0)
        .slice(0, 20),
    kitapSecGeneralCanaryHealth,
    kitapSecGeneralCanaryShadowBookCount:
      kitapSecGeneralCanaryShadowSamples.length,
    kitapSecGeneralCanaryShadowOverlapWithCompositeCount:
      kitapSecGeneralCanaryShadowSamples.filter(
        (sample) => sample.currentSourceCodes.length >= 1,
      ).length,
    kitapSecGeneralCanaryShadowWouldReach3StorefrontCount:
      kitapSecGeneralCanaryShadowSamples.filter(
        (sample) => sample.projectedStorefrontSourceCount >= 3,
      ).length,
    kitapSecGeneralCanaryShadowWouldReach3IndependentCount:
      kitapSecGeneralCanaryShadowSamples.filter(
        (sample) => sample.projectedIndependentSourceCount >= 3,
      ).length,
    kitapSecGeneralCanaryShadowPairOverlap,
    kitapSecGeneralCanaryShadowSamples:
      kitapSecGeneralCanaryShadowSamples
        .filter((sample) => sample.currentSourceCodes.length > 0)
        .slice(0, 20),
    pandoraCanaryHealth,
    pandoraCanaryShadowBookCount: pandoraCanaryShadowSamples.length,
    pandoraCanaryShadowOverlapWithCompositeCount:
      pandoraCanaryShadowSamples.filter(
        (sample) => sample.currentSourceCodes.length >= 1,
      ).length,
    pandoraCanaryShadowWouldReach3StorefrontCount:
      pandoraCanaryShadowSamples.filter(
        (sample) => sample.projectedStorefrontSourceCount >= 3,
      ).length,
    pandoraCanaryShadowWouldReach3IndependentCount:
      pandoraCanaryShadowSamples.filter(
        (sample) => sample.projectedIndependentSourceCount >= 3,
      ).length,
    pandoraCanaryShadowPairOverlap,
    pandoraCanaryShadowSamples:
      pandoraCanaryShadowSamples
        .filter((sample) => sample.currentSourceCodes.length > 0)
        .slice(0, 20),
    kitapAmbariCanaryHealth,
    kitapAmbariCanaryShadowBookCount: kitapAmbariCanaryShadowSamples.length,
    kitapAmbariCanaryShadowOverlapWithCompositeCount:
      kitapAmbariCanaryShadowSamples.filter(
        (sample) => sample.currentSourceCodes.length >= 1,
      ).length,
    kitapAmbariCanaryShadowWouldReach3StorefrontCount:
      kitapAmbariCanaryShadowSamples.filter(
        (sample) => sample.projectedStorefrontSourceCount >= 3,
      ).length,
    kitapAmbariCanaryShadowWouldReach3IndependentCount:
      kitapAmbariCanaryShadowSamples.filter(
        (sample) => sample.projectedIndependentSourceCount >= 3,
      ).length,
    kitapAmbariCanaryShadowPairOverlap,
    kitapAmbariCanaryShadowSamples:
      kitapAmbariCanaryShadowSamples
        .filter((sample) => sample.currentSourceCodes.length > 0)
        .slice(0, 20),
    sourceHistoryMaturity,
    minimumSourceSuccessfulRunCount,
    minimumSourceHistorySpanHours,
    leastSuccessfulRunCountSourceCodes,
    shortestHistorySpanSourceCodes,
    leastMatureSourceCodes,
    firstObservationAt,
    lastObservationAt,
    historySpanHours: historySpanHoursBetween(firstObservationAt, lastObservationAt),
    historySpanDays: historySpanDays(firstObservationAt, lastObservationAt),
    publicRolloutState: "gated",
  };
}
