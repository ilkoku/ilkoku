import "server-only";

import { prisma } from "@/lib/prisma";

import { TURKEY_INDEX_MIN_SOURCES } from "./sources";

type SnapshotBook = {
  masterBookId: string;
  title: string;
  authorName: string | null;
  rank: number;
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
};

export type BookIndexRiser = {
  masterBookId: string;
  title: string;
  authorName: string | null;
  improvingSourceCount: number;
  totalRankGain: number;
  bestCurrentRank: number;
};

export type BookIndexEverywhereSeller = {
  masterBookId: string;
  title: string;
  authorName: string | null;
  sourceCount: number;
  bestRank: number;
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
  sourceCount: bigint | number;
  observationCount: bigint | number;
};

function toSnapshotMap(
  observations: Array<{
    rank: number;
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
      COUNT(DISTINCT list.sourceId) AS sourceCount,
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
      COUNT(DISTINCT list.sourceId) DESC,
      COUNT(*) DESC
    LIMIT ${limit}
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

  return rows.flatMap((row) => {
    const book = bookById.get(row.masterBookId);
    if (!book) return [];

    return [{
      masterBookId: row.masterBookId,
      title: book.title,
      authorName: book.authorName,
      firstObservedAt: row.firstObservedAt,
      lastObservedAt: row.lastObservedAt,
      historyDays: historyDays(row.firstObservedAt, row.lastObservedAt),
      sourceCount: Number(row.sourceCount),
      observationCount: Number(row.observationCount),
    } satisfies BookIndexLongSeller];
  });
}

export async function getBookIndexInsights(limit = 20): Promise<BookIndexInsights> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 50);
  const snapshots = await loadSourceSnapshots();

  const currentSourcesByBook = new Map<string, Set<string>>();
  const bestRankByBook = new Map<string, number>();
  const bookById = new Map<string, { title: string; authorName: string | null }>();

  const newSourceCount = new Map<string, number>();
  const improvingSources = new Map<string, Set<string>>();
  const totalRankGain = new Map<string, number>();

  for (const snapshot of snapshots) {
    for (const [masterBookId, current] of snapshot.current) {
      bookById.set(masterBookId, {
        title: current.title,
        authorName: current.authorName,
      });

      const sources = currentSourcesByBook.get(masterBookId) ?? new Set<string>();
      sources.add(snapshot.sourceCode);
      currentSourcesByBook.set(masterBookId, sources);

      const currentBest = bestRankByBook.get(masterBookId);
      bestRankByBook.set(
        masterBookId,
        currentBest === undefined ? current.rank : Math.min(currentBest, current.rank),
      );

      if (!snapshot.hasPrevious) continue;

      const previous = snapshot.previous.get(masterBookId);
      if (!previous) {
        newSourceCount.set(
          masterBookId,
          (newSourceCount.get(masterBookId) ?? 0) + 1,
        );
        continue;
      }

      const gain = previous.rank - current.rank;
      if (gain <= 0) continue;

      const sourcesImproving =
        improvingSources.get(masterBookId) ?? new Set<string>();
      sourcesImproving.add(snapshot.sourceCode);
      improvingSources.set(masterBookId, sourcesImproving);
      totalRankGain.set(
        masterBookId,
        (totalRankGain.get(masterBookId) ?? 0) + gain,
      );
    }
  }

  const newEntries = [...newSourceCount.entries()]
    .flatMap(([masterBookId, count]) => {
      const book = bookById.get(masterBookId);
      const sources = currentSourcesByBook.get(masterBookId);
      const bestRank = bestRankByBook.get(masterBookId);
      if (!book || !sources || bestRank === undefined) return [];

      return [{
        masterBookId,
        title: book.title,
        authorName: book.authorName,
        newSourceCount: count,
        currentSourceCount: sources.size,
        bestRank,
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

  const risers = [...improvingSources.entries()]
    .flatMap(([masterBookId, sources]) => {
      const book = bookById.get(masterBookId);
      const bestCurrentRank = bestRankByBook.get(masterBookId);
      if (!book || bestCurrentRank === undefined) return [];

      return [{
        masterBookId,
        title: book.title,
        authorName: book.authorName,
        improvingSourceCount: sources.size,
        totalRankGain: totalRankGain.get(masterBookId) ?? 0,
        bestCurrentRank,
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

  const everywhereSellers = [...currentSourcesByBook.entries()]
    .filter(([, sources]) => sources.size >= TURKEY_INDEX_MIN_SOURCES)
    .flatMap(([masterBookId, sources]) => {
      const book = bookById.get(masterBookId);
      const bestRank = bestRankByBook.get(masterBookId);
      if (!book || bestRank === undefined) return [];

      return [{
        masterBookId,
        title: book.title,
        authorName: book.authorName,
        sourceCount: sources.size,
        bestRank,
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
