import { prisma } from "@/lib/prisma";

import { BOOK_INDEX_LISTS } from "./lists";

export type TurkeyNewReleaseSource = {
  sourceCode: string;
  sourceName: string;
  position: number;
  observedAt: Date;
};

export type TurkeyNewReleaseRow = {
  rowKey: string;
  masterBookId: string | null;
  title: string;
  authorName: string | null;
  publisherName: string | null;
  imageUrl: string | null;
  latestObservedAt: Date;
  sources: TurkeyNewReleaseSource[];
};

export async function getTurkeyNewReleaseRows(limit = 500) {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 1000);
  const enabledNewReleaseListCodes = BOOK_INDEX_LISTS
    .filter((list) => list.enabled && list.categoryKey === "new-releases")
    .map((list) => list.code);

  if (enabledNewReleaseListCodes.length === 0) return [];

  const lists = await prisma.bookIndexList.findMany({
    where: {
      active: true,
      code: { in: enabledNewReleaseListCodes },
      categoryKey: "new-releases",
      source: {
        status: "active",
        countryCode: "TR",
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
              observedAt: true,
              externalBook: {
                select: {
                  id: true,
                  title: true,
                  authorName: true,
                  publisherName: true,
                  imageUrl: true,
                  masterBookId: true,
                  masterBook: {
                    select: {
                      title: true,
                      authorName: true,
                      publisherName: true,
                      coverUrl: true,
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

  type RowAccumulator = Omit<TurkeyNewReleaseRow, "sources"> & {
    sources: Map<string, TurkeyNewReleaseSource>;
  };

  const rowsByBook = new Map<string, RowAccumulator>();

  for (const entry of latestRuns) {
    if (!entry) continue;

    for (const observation of entry.run.observations) {
      const externalBook = observation.externalBook;
      const identity = externalBook.masterBookId
        ? `master:${externalBook.masterBookId}`
        : `external:${entry.list.source.code}:${externalBook.id}`;

      const title = externalBook.masterBook?.title ?? externalBook.title;
      const authorName =
        externalBook.masterBook?.authorName ?? externalBook.authorName ?? null;
      const publisherName =
        externalBook.masterBook?.publisherName
        ?? externalBook.publisherName
        ?? null;
      const imageUrl =
        externalBook.masterBook?.coverUrl ?? externalBook.imageUrl ?? null;

      const current =
        rowsByBook.get(identity) ?? {
          rowKey: identity,
          masterBookId: externalBook.masterBookId,
          title,
          authorName,
          publisherName,
          imageUrl,
          latestObservedAt: observation.observedAt,
          sources: new Map<string, TurkeyNewReleaseSource>(),
        };

      if (observation.observedAt > current.latestObservedAt) {
        current.latestObservedAt = observation.observedAt;
      }

      const existingSource = current.sources.get(entry.list.source.code);
      if (!existingSource || observation.rank < existingSource.position) {
        current.sources.set(entry.list.source.code, {
          sourceCode: entry.list.source.code,
          sourceName: entry.list.source.name,
          position: observation.rank,
          observedAt: observation.observedAt,
        });
      }

      rowsByBook.set(identity, current);
    }
  }

  return [...rowsByBook.values()]
    .map((row) => ({
      rowKey: row.rowKey,
      masterBookId: row.masterBookId,
      title: row.title,
      authorName: row.authorName,
      publisherName: row.publisherName,
      imageUrl: row.imageUrl,
      latestObservedAt: row.latestObservedAt,
      sources: [...row.sources.values()].sort(
        (a, b) =>
          a.sourceName.localeCompare(b.sourceName, "tr")
          || a.position - b.position,
      ),
    }))
    .sort(
      (a, b) =>
        b.latestObservedAt.getTime() - a.latestObservedAt.getTime()
        || a.title.localeCompare(b.title, "tr"),
    )
    .slice(0, safeLimit);
}
