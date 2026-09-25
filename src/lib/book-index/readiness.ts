import "server-only";

import { prisma } from "@/lib/prisma";

import { BOOK_INDEX_LISTS } from "./lists";

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
  firstObservationAt: Date | null;
  lastObservationAt: Date | null;
  historySpanDays: number;
  publicRolloutState: "gated";
};

function historySpanDays(first: Date | null, last: Date | null) {
  if (!first || !last) return 0;
  return Math.max(
    0,
    Math.floor((last.getTime() - first.getTime()) / 86_400_000),
  );
}

export async function getBookIndexReadinessSnapshot(): Promise<BookIndexReadinessSnapshot> {
  const compositeSourceCodes = [
    ...new Set(
      BOOK_INDEX_LISTS
        .filter((list) => list.enabled && list.includeInComposite)
        .map((list) => list.sourceCode),
    ),
  ];

  const [
    externalBookCount,
    matchedExternalBookCount,
    observationRange,
    persistedCompositeLists,
  ] = await Promise.all([
    prisma.bookIndexExternalBook.count(),
    prisma.bookIndexExternalBook.count({
      where: {
        masterBookId: { not: null },
      },
    }),
    prisma.bookIndexObservation.aggregate({
      _min: { observedAt: true },
      _max: { observedAt: true },
    }),
    prisma.bookIndexList.findMany({
      where: {
        active: true,
        includeInComposite: true,
        source: {
          includeInTurkeyIndex: true,
          status: "active",
        },
      },
      select: {
        source: {
          select: {
            code: true,
          },
        },
        fetchRuns: {
          where: {
            status: { in: ["success", "no_change"] },
          },
          orderBy: {
            startedAt: "desc",
          },
          take: 1,
          select: {
            id: true,
            observations: {
              select: {
                externalBook: {
                  select: {
                    masterBookId: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  const observedCompositeSourceCodes = [
    ...new Set(
      persistedCompositeLists
        .filter((list) => list.fetchRuns.length > 0)
        .map((list) => list.source.code),
    ),
  ].sort((a, b) => a.localeCompare(b, "tr"));

  const sourceCodesByMasterBook = new Map<string, Set<string>>();

  for (const list of persistedCompositeLists) {
    const latestRun = list.fetchRuns[0];
    if (!latestRun) continue;

    for (const observation of latestRun.observations) {
      const masterBookId = observation.externalBook.masterBookId;
      if (!masterBookId) continue;

      const sourceCodes =
        sourceCodesByMasterBook.get(masterBookId) ?? new Set<string>();
      sourceCodes.add(list.source.code);
      sourceCodesByMasterBook.set(masterBookId, sourceCodes);
    }
  }

  const compositeSourceCounts = [...sourceCodesByMasterBook.values()].map(
    (sourceCodes) => sourceCodes.size,
  );

  const firstObservationAt = observationRange._min.observedAt ?? null;
  const lastObservationAt = observationRange._max.observedAt ?? null;
  const unmatchedExternalBookCount =
    externalBookCount - matchedExternalBookCount;

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
    maxCompositeSourcesPerBook: compositeSourceCounts.length
      ? Math.max(...compositeSourceCounts)
      : 0,
    booksOnAtLeast2CompositeSources: compositeSourceCounts.filter(
      (count) => count >= 2,
    ).length,
    booksOnAtLeast3CompositeSources: compositeSourceCounts.filter(
      (count) => count >= 3,
    ).length,
    firstObservationAt,
    lastObservationAt,
    historySpanDays: historySpanDays(firstObservationAt, lastObservationAt),
    publicRolloutState: "gated",
  };
}
