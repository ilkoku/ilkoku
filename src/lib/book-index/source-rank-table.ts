import { prisma } from "@/lib/prisma";

export type TurkeySourceRankRow = {
  rowKey: string;
  rank: number;
  masterBookId: string | null;
  title: string;
  authorName: string | null;
  sources: Array<{
    sourceCode: string;
    sourceName: string;
  }>;
};

export async function getTurkeySourceRankRows(limit = 1000) {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 2000);

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
      const run = await prisma.bookIndexFetchRun.findFirst({
        where: {
          listId: list.id,
          status: { in: ["success", "no_change"] },
        },
        orderBy: { startedAt: "desc" },
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

      return run ? { list, run } : null;
    }),
  );

  type RowAccumulator = Omit<TurkeySourceRankRow, "sources"> & {
    sources: Map<string, string>;
  };

  const rowsByRankAndBook = new Map<string, RowAccumulator>();

  for (const entry of latestRuns) {
    if (!entry) continue;

    for (const observation of entry.run.observations) {
      const externalBook = observation.externalBook;
      const identity = externalBook.masterBookId
        ? `master:${externalBook.masterBookId}`
        : `external:${entry.list.source.code}:${externalBook.id}`;
      const rowKey = `${observation.rank}|${identity}`;
      const title = externalBook.masterBook?.title ?? externalBook.title;
      const authorName =
        externalBook.masterBook?.authorName ?? externalBook.authorName ?? null;

      const current =
        rowsByRankAndBook.get(rowKey) ?? {
          rowKey,
          rank: observation.rank,
          masterBookId: externalBook.masterBookId,
          title,
          authorName,
          sources: new Map<string, string>(),
        };

      current.sources.set(entry.list.source.code, entry.list.source.name);
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
      sources: [...row.sources.entries()]
        .map(([sourceCode, sourceName]) => ({ sourceCode, sourceName }))
        .sort((a, b) => a.sourceName.localeCompare(b.sourceName, "tr")),
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
