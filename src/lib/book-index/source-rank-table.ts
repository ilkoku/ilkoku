import { prisma } from "@/lib/prisma";

import { BOOK_INDEX_LISTS } from "./lists";

export type SourceRankMovement = "up" | "down" | "same" | "new" | "unknown";

export type TurkeySourceRankRow = {
  rowKey: string;
  rank: number;
  masterBookId: string | null;
  title: string;
  authorName: string | null;
  sources: Array<{
    sourceCode: string;
    sourceName: string;
    movement: SourceRankMovement;
    rankDelta: number | null;
  }>;
};

export async function getTurkeySourceRankRows(limit = 1000) {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 2000);
  const publicTurkeyListCodes = BOOK_INDEX_LISTS
    .filter(
      (list) =>
        list.enabled
        && list.categoryKey === "general"
        && (list.includeInComposite || list.includeInTurkeyDisplay === true),
    )
    .map((list) => list.code);

  const lists = await prisma.bookIndexList.findMany({
    where: {
      active: true,
      code: { in: publicTurkeyListCodes },
      source: {
        includeInTurkeyIndex: true,
        status: "active",
      },
    },
    select: {
      id: true,
      code: true,
      source: {
        select: {
          code: true,
          name: true,
        },
      },
    },
    orderBy: [{ source: { code: "asc" } }, { code: "asc" }],
  });

  const latestRuns = await Promise.all(
    lists.map(async (list) => {
      const runs = await prisma.bookIndexFetchRun.findMany({
        where: {
          listId: list.id,
          status: { in: ["success", "no_change"] },
        },
        orderBy: { startedAt: "desc" },
        take: 2,
        select: {
          observations: {
            orderBy: { rank: "asc" },
            select: {
              rank: true,
              externalBook: {
                select: {
                  id: true,
                  title: true,
                  authorName: true,
                  masterBookId: true,
                  masterBook: {
                    select: {
                      title: true,
                      authorName: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      const currentRun = runs[0];
      if (!currentRun) return null;

      return {
        list,
        currentRun,
        previousRun: runs[1] ?? null,
      };
    }),
  );

  type SourceState = TurkeySourceRankRow["sources"][number];
  type RowAccumulator = Omit<TurkeySourceRankRow, "sources"> & {
    sources: Map<string, SourceState>;
  };

  const rowsByRankAndBook = new Map<string, RowAccumulator>();

  for (const entry of latestRuns) {
    if (!entry) continue;

    const previousRanks = new Map<string, number>();

    if (entry.previousRun) {
      for (const observation of entry.previousRun.observations) {
        const externalBook = observation.externalBook;
        const identity = externalBook.masterBookId
          ? `master:${externalBook.masterBookId}`
          : `external:${entry.list.source.code}:${externalBook.id}`;
        const previousRank = previousRanks.get(identity);

        if (previousRank === undefined || observation.rank < previousRank) {
          previousRanks.set(identity, observation.rank);
        }
      }
    }

    for (const observation of entry.currentRun.observations) {
      const externalBook = observation.externalBook;
      const identity = externalBook.masterBookId
        ? `master:${externalBook.masterBookId}`
        : `external:${entry.list.source.code}:${externalBook.id}`;
      const rowKey = `${observation.rank}|${identity}`;
      const title = externalBook.masterBook?.title ?? externalBook.title;
      const authorName =
        externalBook.masterBook?.authorName ?? externalBook.authorName ?? null;
      const previousRank = previousRanks.get(identity);

      let movement: SourceRankMovement = "unknown";
      let rankDelta: number | null = null;

      if (entry.previousRun) {
        if (previousRank === undefined) {
          movement = "new";
        } else {
          rankDelta = previousRank - observation.rank;
          movement = rankDelta > 0 ? "up" : rankDelta < 0 ? "down" : "same";
        }
      }

      const current =
        rowsByRankAndBook.get(rowKey) ?? {
          rowKey,
          rank: observation.rank,
          masterBookId: externalBook.masterBookId,
          title,
          authorName,
          sources: new Map<string, SourceState>(),
        };

      current.sources.set(entry.list.source.code, {
        sourceCode: entry.list.source.code,
        sourceName: entry.list.source.name,
        movement,
        rankDelta,
      });
      rowsByRankAndBook.set(rowKey, current);
    }
  }

  return [...rowsByRankAndBook.values()]
    .map((row) => ({
      rowKey: row.rowKey,
      rank: row.rank,
      masterBookId: row.masterBookId,
      title: row.title,
      authorName: row.authorName,
      sources: [...row.sources.values()].sort((a, b) =>
        a.sourceName.localeCompare(b.sourceName, "tr"),
      ),
    }))
    .sort(
      (a, b) =>
        a.rank - b.rank
        || a.title.localeCompare(b.title, "tr")
        || a.sources
          .map((source) => source.sourceName)
          .join("|")
          .localeCompare(
            b.sources.map((source) => source.sourceName).join("|"),
            "tr",
          ),
    )
    .slice(0, safeLimit);
}
