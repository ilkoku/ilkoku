import "server-only";

import { prisma } from "@/lib/prisma";

import { BOOK_INDEX_LISTS } from "./lists";

export type BookIndexListOperationsRow = {
  listCode: string;
  sourceCode: string;
  title: string;
  cadenceMinutes: number | null;
  persisted: boolean;
  active: boolean;
  sourceStatus: "active" | "paused" | "blocked" | null;
  latestRunStatus: string | null;
  latestRunAt: Date | null;
  latestRunCompletedAt: Date | null;
  latestRunItems: number | null;
  latestRunErrorCode: string | null;
  lastSuccessfulRunAt: Date | null;
  nextDueAt: Date | null;
  due: boolean;
};

export type BookIndexOperationsSnapshot = {
  checkedAt: Date;
  schedulerAuthMode: "github_oidc";
  schedulerSecretConfigured: boolean;
  dueCount: number;
  rows: BookIndexListOperationsRow[];
};

export async function getBookIndexOperationsSnapshot(
  now = new Date(),
): Promise<BookIndexOperationsSnapshot> {
  const codes = BOOK_INDEX_LISTS.map((list) => list.code);

  const persistedLists = await prisma.bookIndexList.findMany({
    where: {
      code: { in: codes },
    },
    select: {
      id: true,
      code: true,
      active: true,
      collectionEveryMinutes: true,
      source: {
        select: {
          code: true,
          status: true,
        },
      },
      fetchRuns: {
        orderBy: { startedAt: "desc" },
        take: 1,
        select: {
          status: true,
          startedAt: true,
          completedAt: true,
          itemsStored: true,
          errorCode: true,
        },
      },
    },
  });

  const persistedByCode = new Map(
    persistedLists.map((list) => [list.code, list] as const),
  );

  const persistedIds = persistedLists.map((list) => list.id);
  const successfulGroups = persistedIds.length
    ? await prisma.bookIndexFetchRun.groupBy({
        by: ["listId"],
        where: {
          listId: { in: persistedIds },
          status: { in: ["success", "no_change"] },
        },
        _max: {
          startedAt: true,
        },
      })
    : [];

  const lastSuccessByListId = new Map(
    successfulGroups.map((row) => [
      row.listId,
      row._max.startedAt ?? null,
    ] as const),
  );

  const rows = BOOK_INDEX_LISTS.map((definition) => {
    const persisted = persistedByCode.get(definition.code) ?? null;
    const latest = persisted?.fetchRuns[0] ?? null;
    const cadenceMinutes =
      persisted?.collectionEveryMinutes
      ?? definition.collectionEveryMinutes
      ?? null;

    const nextDueAt =
      latest && cadenceMinutes !== null
        ? new Date(latest.startedAt.getTime() + cadenceMinutes * 60_000)
        : null;

    const runnable =
      definition.enabled
      && cadenceMinutes !== null
      && (persisted?.active ?? true)
      && persisted?.source.status !== "blocked"
      && persisted?.source.status !== "paused";

    return {
      listCode: definition.code,
      sourceCode: definition.sourceCode,
      title: definition.title,
      cadenceMinutes,
      persisted: Boolean(persisted),
      active: persisted?.active ?? definition.enabled,
      sourceStatus: persisted?.source.status ?? null,
      latestRunStatus: latest?.status ?? null,
      latestRunAt: latest?.startedAt ?? null,
      latestRunCompletedAt: latest?.completedAt ?? null,
      latestRunItems: latest?.itemsStored ?? null,
      latestRunErrorCode: latest?.errorCode ?? null,
      lastSuccessfulRunAt: persisted
        ? lastSuccessByListId.get(persisted.id) ?? null
        : null,
      nextDueAt,
      due: runnable && (!nextDueAt || nextDueAt.getTime() <= now.getTime()),
    } satisfies BookIndexListOperationsRow;
  });

  return {
    checkedAt: now,
    schedulerAuthMode: "github_oidc",
    schedulerSecretConfigured: Boolean(
      process.env.BOOK_INDEX_SCHEDULER_SECRET?.trim(),
    ),
    dueCount: rows.filter((row) => row.due).length,
    rows,
  };
}
