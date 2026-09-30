import "server-only";

import { prisma } from "@/lib/prisma";

import {
  getBookIndexSource,
  getBookIndexSourceIndependenceGroup,
  TURKEY_INDEX_MIN_SOURCES,
} from "./sources";

type SnapshotBook = {
  masterBookId: string;
  title: string;
  authorName: string | null;
  rank: number;
  observedAt: Date;
};

export type BookIndexSourceRankEvidence = {
  sourceCode: string;
  sourceName: string;
  currentRank: number;
  observedAt: Date;
};

export type BookIndexRiserSourceEvidence = BookIndexSourceRankEvidence & {
  previousRank: number;
  rankGain: number;
};

type SourceSnapshot = {
  sourceCode: string;
  current: Map<string, SnapshotBook>;
  previous: Map<string, SnapshotBook>;
  hasPrevious: boolean;
};

export type BookIndexNewEntry = {
  masterBookId: string;
  title: string;
  authorName: string | null;
  newSourceCount: number;
  currentSourceCount: number;
  bestRank: number;
  sources: BookIndexSourceRankEvidence[];
};

export type BookIndexRiser = {
  masterBookId: string;
  title: string;
  authorName: string | null;
  improvingSourceCount: number;
  totalRankGain: number;
  bestCurrentRank: number;
  sources: BookIndexRiserSourceEvidence[];
};

export type BookIndexEverywhereSeller = {
  masterBookId: string;
  title: string;
  authorName: string | null;
  sourceCount: number;
  bestRank: number;
  sources: BookIndexSourceRankEvidence[];
};

export type BookIndexLongSeller = {
  masterBookId: string;
  title: string;
  authorName: string | null;
  firstObservedAt: Date;
  lastObservedAt: Date;
  historyDays: number;
  sourceCount: number;
  observationCount: number;
  sources: Array<{
    sourceCode: string;
    sourceName: string;
  }>;
};

export type BookIndexInsights = {
  generatedAt: Date;
  newEntries: BookIndexNewEntry[];
  risers: BookIndexRiser[];
  everywhereSellers: BookIndexEverywhereSeller[];
  longSellers: BookIndexLongSeller[];
};

type LongSellerRow = {
  masterBookId: string;
  firstObservedAt: Date;
  lastObservedAt: Date;
  sourceCodes: string | null;
  observationCount: bigint | number;
};

function toSnapshotMap(
  observations: Array<{
    rank: number;
    observedAt: Date;
    externalBook: {
      masterBookId: string | null;
      masterBook: {
        id: string;
        title: string;
        authorName: string | null;
      } | null;
    };
  }>,
) {
  const result = new Map<string, SnapshotBook>();

  for (const observation of observations) {
    const master = observation.externalBook.masterBook;
    const masterBookId = observation.externalBook.masterBookId;
    if (!master || !masterBookId) continue;

    const current = result.get(masterBookId);
    if (!current || observation.rank < current.rank) {
      result.set(masterBookId, {
        masterBookId,
        title: master.title,
        authorName: master.authorName,
        rank: observation.rank,
        observedAt: observation.observedAt,
      });
    }
  }

  return result;
}

function historyDays(first: Date, last: Date) {
  return Math.max(
    0,
    Math.floor((last.getTime() - first.getTime()) / 86_400_000),
  );
}

async function loadSourceSnapshots(): Promise<SourceSnapshot[]> {
  const lists = await prisma.bookIndexList.findMany({
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
        take: 2,
        select: {
          observations: {
            orderBy: { rank: "asc" },
            select: {
              rank: true,
              observedAt: true,
              externalBook: {
                select: {
                  masterBookId: true,
                  masterBook: {
                    select: {
                      id: true,
                      title: true,
                      authorName: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  return lists
    .filter((list) => list.fetchRuns.length > 0)
    .map((list) => ({
      sourceCode: list.source.code,
      current: toSnapshotMap(list.fetchRuns[0]?.observations ?? []),
      previous: toSnapshotMap(list.fetchRuns[1]?.observations ?? []),
      hasPrevious: list.fetchRuns.length >= 2,
    }));
}

async function loadLongSellers(limit: number) {
  const rows = await prisma.$queryRaw<LongSellerRow[]>`
    SELECT
      externalBook.masterBookId AS masterBookId,
      MIN(observation.observedAt) AS firstObservedAt,
      MAX(observation.observedAt) AS lastObservedAt,
      GROUP_CONCAT(DISTINCT source.code ORDER BY source.code SEPARATOR ',') AS sourceCodes,
      COUNT(*) AS observationCount
    FROM BookIndexObservation observation
    INNER JOIN BookIndexExternalBook externalBook
      ON externalBook.id = observation.externalBookId
    INNER JOIN BookIndexFetchRun fetchRun
      ON fetchRun.id = observation.fetchRunId
    INNER JOIN BookIndexList list
      ON list.id = fetchRun.listId
    INNER JOIN BookIndexSource source
      ON source.id = list.sourceId
    WHERE externalBook.masterBookId IS NOT NULL
      AND list.includeInComposite = 1
      AND list.active = 1
      AND source.includeInTurkeyIndex = 1
      AND source.status = 'active'
      AND fetchRun.status IN ('success', 'no_change')
    GROUP BY externalBook.masterBookId
    ORDER BY
      DATEDIFF(MAX(observation.observedAt), MIN(observation.observedAt)) DESC,
      COUNT(*) DESC
  `;

  if (!rows.length) return [];

  const books = await prisma.bookIndexBook.findMany({
    where: {
      id: { in: rows.map((row) => row.masterBookId) },
    },
    select: {
      id: true,
      title: true,
      authorName: true,
    },
  });
  const bookById = new Map(books.map((book) => [book.id, book] as const));

  return rows
    .flatMap((row) => {
      const book = bookById.get(row.masterBookId);
      if (!book) return [];

      const independenceGroups = new Set(
        (row.sourceCodes ?? "")
          .split(",")
          .filter(Boolean)
          .map((sourceCode) => getBookIndexSourceIndependenceGroup(sourceCode)),
      );

      return [{
        masterBookId: row.masterBookId,
        title: book.title,
        authorName: book.authorName,
        firstObservedAt: row.firstObservedAt,
        lastObservedAt: row.lastObservedAt,
        historyDays: historyDays(row.firstObservedAt, row.lastObservedAt),
        sourceCount: independenceGroups.size,
        observationCount: Number(row.observationCount),
        sources: (row.sourceCodes ?? "")
          .split(",")
          .filter(Boolean)
          .map((sourceCode) => ({
            sourceCode,
            sourceName: getBookIndexSource(sourceCode)?.name ?? sourceCode,
          })),
      } satisfies BookIndexLongSeller];
    })
    .sort(
      (a, b) =>
        b.historyDays - a.historyDays
        || b.sourceCount - a.sourceCount
        || b.observationCount - a.observationCount
        || a.title.localeCompare(b.title, "tr"),
    )
    .slice(0, limit);
}

export async function getBookIndexInsights(limit = 20): Promise<BookIndexInsights> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 50);
  const snapshots = await loadSourceSnapshots();

  const currentSourcesByBook = new Map<string, Set<string>>();
  const currentIndependenceGroupsByBook = new Map<string, Set<string>>();
  const bestRankByBook = new Map<string, number>();
  const bookById = new Map<string, { title: string; authorName: string | null }>();

  const newSourcesByBook = new Map<string, Set<string>>();
  const currentEvidenceByBookSource = new Map<string, Map<string, SnapshotBook>>();
  const rankGainByBookSource = new Map<
    string,
    Map<string, {
      previousRank: number;
      currentRank: number;
      rankGain: number;
      observedAt: Date;
    }>
  >();

  for (const snapshot of snapshots) {
    for (const [masterBookId, current] of snapshot.current) {
      bookById.set(masterBookId, {
        title: current.title,
        authorName: current.authorName,
      });

      const sources = currentSourcesByBook.get(masterBookId) ?? new Set<string>();
      sources.add(snapshot.sourceCode);
      currentSourcesByBook.set(masterBookId, sources);

      const evidenceBySource =
        currentEvidenceByBookSource.get(masterBookId) ?? new Map<string, SnapshotBook>();
      evidenceBySource.set(snapshot.sourceCode, current);
      currentEvidenceByBookSource.set(masterBookId, evidenceBySource);

      const independenceGroups =
        currentIndependenceGroupsByBook.get(masterBookId) ?? new Set<string>();
      independenceGroups.add(
        getBookIndexSourceIndependenceGroup(snapshot.sourceCode),
      );
      currentIndependenceGroupsByBook.set(masterBookId, independenceGroups);

      const currentBest = bestRankByBook.get(masterBookId);
      bestRankByBook.set(
        masterBookId,
        currentBest === undefined ? current.rank : Math.min(currentBest, current.rank),
      );

      if (!snapshot.hasPrevious) continue;

      const previous = snapshot.previous.get(masterBookId);
      if (!previous) {
        const newSources =
          newSourcesByBook.get(masterBookId) ?? new Set<string>();
        newSources.add(snapshot.sourceCode);
        newSourcesByBook.set(masterBookId, newSources);
        continue;
      }

      const gain = previous.rank - current.rank;
      if (gain <= 0) continue;

      const gains =
        rankGainByBookSource.get(masterBookId)
        ?? new Map<string, {
          previousRank: number;
          currentRank: number;
          rankGain: number;
          observedAt: Date;
        }>();
      const existingGain = gains.get(snapshot.sourceCode)?.rankGain ?? 0;
      if (gain > existingGain) {
        gains.set(snapshot.sourceCode, {
          previousRank: previous.rank,
          currentRank: current.rank,
          rankGain: gain,
          observedAt: current.observedAt,
        });
      }
      rankGainByBookSource.set(masterBookId, gains);
    }
  }

  const newEntries = [...newSourcesByBook.entries()]
    .flatMap(([masterBookId, newSources]) => {
      const book = bookById.get(masterBookId);
      const sources = currentSourcesByBook.get(masterBookId);
      const bestRank = bestRankByBook.get(masterBookId);
      if (!book || !sources || bestRank === undefined) return [];

      return [{
        masterBookId,
        title: book.title,
        authorName: book.authorName,
        newSourceCount: newSources.size,
        currentSourceCount: sources.size,
        bestRank,
        sources: [...newSources]
          .flatMap((sourceCode) => {
            const evidence = currentEvidenceByBookSource
              .get(masterBookId)
              ?.get(sourceCode);
            if (!evidence) return [];
            return [{
              sourceCode,
              sourceName: getBookIndexSource(sourceCode)?.name ?? sourceCode,
              currentRank: evidence.rank,
              observedAt: evidence.observedAt,
            }];
          })
          .sort((a, b) => a.currentRank - b.currentRank),
      } satisfies BookIndexNewEntry];
    })
    .sort(
      (a, b) =>
        b.newSourceCount - a.newSourceCount
        || b.currentSourceCount - a.currentSourceCount
        || a.bestRank - b.bestRank
        || a.title.localeCompare(b.title, "tr"),
    )
    .slice(0, safeLimit);

  const risers = [...rankGainByBookSource.entries()]
    .flatMap(([masterBookId, gains]) => {
      const book = bookById.get(masterBookId);
      const bestCurrentRank = bestRankByBook.get(masterBookId);
      if (!book || bestCurrentRank === undefined) return [];

      return [{
        masterBookId,
        title: book.title,
        authorName: book.authorName,
        improvingSourceCount: gains.size,
        totalRankGain: [...gains.values()].reduce(
          (sum, evidence) => sum + evidence.rankGain,
          0,
        ),
        bestCurrentRank,
        sources: [...gains.entries()]
          .map(([sourceCode, evidence]) => ({
            sourceCode,
            sourceName: getBookIndexSource(sourceCode)?.name ?? sourceCode,
            currentRank: evidence.currentRank,
            previousRank: evidence.previousRank,
            rankGain: evidence.rankGain,
            observedAt: evidence.observedAt,
          }))
          .sort(
            (a, b) =>
              b.rankGain - a.rankGain
              || a.currentRank - b.currentRank,
          ),
      } satisfies BookIndexRiser];
    })
    .sort(
      (a, b) =>
        b.improvingSourceCount - a.improvingSourceCount
        || b.totalRankGain - a.totalRankGain
        || a.bestCurrentRank - b.bestCurrentRank
        || a.title.localeCompare(b.title, "tr"),
    )
    .slice(0, safeLimit);

  const everywhereSellers = [...currentIndependenceGroupsByBook.entries()]
    .filter(
      ([, independenceGroups]) =>
        independenceGroups.size >= TURKEY_INDEX_MIN_SOURCES,
    )
    .flatMap(([masterBookId, independenceGroups]) => {
      const book = bookById.get(masterBookId);
      const bestRank = bestRankByBook.get(masterBookId);
      if (!book || bestRank === undefined) return [];

      return [{
        masterBookId,
        title: book.title,
        authorName: book.authorName,
        sourceCount: independenceGroups.size,
        bestRank,
        sources: [...(currentEvidenceByBookSource.get(masterBookId)?.entries() ?? [])]
          .map(([sourceCode, evidence]) => ({
            sourceCode,
            sourceName: getBookIndexSource(sourceCode)?.name ?? sourceCode,
            currentRank: evidence.rank,
            observedAt: evidence.observedAt,
          }))
          .sort((a, b) => a.currentRank - b.currentRank),
      } satisfies BookIndexEverywhereSeller];
    })
    .sort(
      (a, b) =>
        b.sourceCount - a.sourceCount
        || a.bestRank - b.bestRank
        || a.title.localeCompare(b.title, "tr"),
    )
    .slice(0, safeLimit);

  return {
    generatedAt: new Date(),
    newEntries,
    risers,
    everywhereSellers,
    longSellers: await loadLongSellers(safeLimit),
  };
}
