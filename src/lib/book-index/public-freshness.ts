import "server-only";

import { cache } from "react";
import { prisma } from "@/lib/prisma";

import { BOOK_INDEX_LISTS, getBookIndexList } from "./lists";
import { timeBookIndexOperation } from "./performance-trace";
import { getBookIndexSource } from "./sources";

/**
 * The four public insight pages display only the most recent successful
 * source-list fetch timestamp. Do not assemble the entire Turkey rankings,
 * source-book observations and SEO readiness gate just to obtain that date.
 *
 * This mirrors getBookIndexLastObservedAt(getBookIndexPublicReadModel(100)):
 * enabled + publiclyVisible registry lists, exact source+list identity,
 * persisted active lists, non-paused/non-blocked sources, and newest
 * success/no_change fetch run's startedAt. No cross-request stale cache.
 */
export const getBookIndexPublicLastObservedAt = cache(async (): Promise<Date | null> => {
  const listCodes = BOOK_INDEX_LISTS
    .filter((list) => list.enabled && list.publiclyVisible)
    .map((list) => list.code);

  if (listCodes.length === 0) return null;

  const persisted = await timeBookIndexOperation(
    "publicFreshness.latestSourceRunsSql",
    () => prisma.bookIndexList.findMany({
      where: { code: { in: [...new Set(listCodes)] } },
      select: {
        code: true,
        active: true,
        source: { select: { code: true, status: true } },
        fetchRuns: {
          where: { status: { in: ["success", "no_change"] } },
          orderBy: { startedAt: "desc" },
          take: 1,
          select: { startedAt: true },
        },
      },
    }),
  );

  // BookIndexList.code is unique only within one source. Match both keys.
  const bySourceAndCode = new Map(
    persisted.map((row) => [`${row.source.code}:${row.code}`, row] as const),
  );

  let latest: Date | null = null;
  for (const code of listCodes) {
    const definition = getBookIndexList(code);
    if (!definition || !getBookIndexSource(definition.sourceCode)) continue;

    const row = bySourceAndCode.get(`${definition.sourceCode}:${definition.code}`);
    if (!row?.active) continue;
    if (row.source.status === "blocked" || row.source.status === "paused") continue;

    const startedAt = row.fetchRuns[0]?.startedAt;
    if (startedAt && (!latest || startedAt.getTime() > latest.getTime())) {
      latest = startedAt;
    }
  }
  return latest;
});
