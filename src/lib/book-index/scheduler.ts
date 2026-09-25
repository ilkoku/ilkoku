import "server-only";

import { prisma } from "@/lib/prisma";

import {
  bootstrapBookIndexList,
  collectBookIndexListByCode,
} from "./collector";
import { BOOK_INDEX_LISTS } from "./lists";

type SchedulerResultStatus =
  | "not_due"
  | "inactive"
  | "success"
  | "no_change"
  | "failed";

type SchedulerResult = {
  listCode: string;
  sourceCode: string;
  status: SchedulerResultStatus;
  items?: number;
  lastRunAt?: string | null;
  nextDueAt?: string | null;
  error?: string;
};

function safeErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message.slice(0, 300);
  return "BOOK_INDEX_SCHEDULER_UNKNOWN_ERROR";
}

export async function runBookIndexScheduler(now = new Date()) {
  const results: SchedulerResult[] = [];
  let checked = 0;
  let due = 0;
  let succeeded = 0;
  let unchanged = 0;
  let failed = 0;
  let skipped = 0;
  let itemsStored = 0;

  for (const listDefinition of BOOK_INDEX_LISTS) {
    if (!listDefinition.enabled || listDefinition.collectionEveryMinutes === null) {
      continue;
    }

    checked += 1;

    try {
      const { source, list } = await bootstrapBookIndexList(listDefinition.code);

      if (!list.active || source.status !== "active") {
        skipped += 1;
        results.push({
          listCode: listDefinition.code,
          sourceCode: listDefinition.sourceCode,
          status: "inactive",
        });
        continue;
      }

      const latest = await prisma.bookIndexFetchRun.findFirst({
        where: { listId: list.id },
        orderBy: { startedAt: "desc" },
        select: {
          startedAt: true,
          status: true,
        },
      });

      const intervalMs = listDefinition.collectionEveryMinutes * 60_000;
      const nextDueAt = latest
        ? new Date(latest.startedAt.getTime() + intervalMs)
        : null;

      if (latest && nextDueAt && nextDueAt.getTime() > now.getTime()) {
        skipped += 1;
        results.push({
          listCode: listDefinition.code,
          sourceCode: listDefinition.sourceCode,
          status: "not_due",
          lastRunAt: latest.startedAt.toISOString(),
          nextDueAt: nextDueAt.toISOString(),
        });
        continue;
      }

      due += 1;

      try {
        const collected = await collectBookIndexListByCode(listDefinition.code);
        itemsStored += collected.items;

        if (collected.status === "no_change") {
          unchanged += 1;
        } else {
          succeeded += 1;
        }

        results.push({
          listCode: listDefinition.code,
          sourceCode: listDefinition.sourceCode,
          status: collected.status,
          items: collected.items,
          lastRunAt: now.toISOString(),
        });
      } catch (error) {
        failed += 1;
        results.push({
          listCode: listDefinition.code,
          sourceCode: listDefinition.sourceCode,
          status: "failed",
          error: safeErrorMessage(error),
        });
      }
    } catch (error) {
      failed += 1;
      results.push({
        listCode: listDefinition.code,
        sourceCode: listDefinition.sourceCode,
        status: "failed",
        error: safeErrorMessage(error),
      });
    }
  }

  return {
    checkedAt: now.toISOString(),
    checked,
    due,
    succeeded,
    unchanged,
    failed,
    skipped,
    itemsStored,
    results,
  };
}
