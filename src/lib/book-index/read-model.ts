import { prisma } from "@/lib/prisma";

import {
  computeTurkeyBookIndexScore,
  type BookIndexSourceVoteInput,
} from "./ranking";

export type TurkeyBookIndexPreviewRow = {
  masterBookId: string;
  title: string;
  authorName: string | null;
  score: number;
  sourceCount: number;
  sources: Array<{
    sourceCode: string;
    sourceName: string;
    rank: number;
    listSize: number;
    normalizedScore: number;
  }>;
};

export async function getTurkeyBookIndexPreview(limit = 50) {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100);

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
          includeInTurkeyIndex: true,
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
          id: true,
          startedAt: true,
          itemsStored: true,
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
      });

      return run ? { list, run } : null;
    }),
  );

  type PreviewBucket = {
    book: {
      id: string;
      title: string;
      authorName: string | null;
    };
    votes: BookIndexSourceVoteInput[];
    labels: Map<
      string,
      {
        sourceName: string;
        rank: number;
        listSize: number;
      }
    >;
  };

  const byBook = new Map<string, PreviewBucket>();

  for (const entry of latestRuns) {
    if (!entry) continue;

    const listSize = Math.max(entry.run.itemsStored, 1);

    for (const observation of entry.run.observations) {
      const master = observation.externalBook.masterBook;
      const masterBookId = observation.externalBook.masterBookId;

      if (!master || !masterBookId) continue;

      const bucket: PreviewBucket =
        byBook.get(masterBookId) ?? {
          book: master,
          votes: [],
          labels: new Map(),
        };

      bucket.votes.push({
        sourceCode: entry.list.source.code,
        includeInTurkeyIndex: entry.list.source.includeInTurkeyIndex,
        eligibleForComposite: true,
        rank: observation.rank,
        listSize,
        observedAt: entry.run.startedAt,
      });

      const current = bucket.labels.get(entry.list.source.code);
      if (!current || observation.rank < current.rank) {
        bucket.labels.set(entry.list.source.code, {
          sourceName: entry.list.source.name,
          rank: observation.rank,
          listSize,
        });
      }

      byBook.set(masterBookId, bucket);
    }
  }

  const rows: TurkeyBookIndexPreviewRow[] = [];

  for (const [masterBookId, bucket] of byBook) {
    const result = computeTurkeyBookIndexScore(bucket.votes);
    if (!result.eligible || result.score === null) continue;

    const sources = result.votes.map((vote) => {
      const label = bucket.labels.get(vote.sourceCode);

      return {
        sourceCode: vote.sourceCode,
        sourceName: label?.sourceName ?? vote.sourceCode,
        rank: vote.rank,
        listSize: vote.listSize,
        normalizedScore: vote.normalizedScore,
      };
    });

    rows.push({
      masterBookId,
      title: bucket.book.title,
      authorName: bucket.book.authorName,
      score: result.score,
      sourceCount: result.sourceCount,
      sources,
    });
  }

  return rows
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.sourceCount - a.sourceCount ||
        a.title.localeCompare(b.title, "tr"),
    )
    .slice(0, safeLimit);
}
