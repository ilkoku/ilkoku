import "server-only";

import { prisma } from "@/lib/prisma";

import { BOOK_INDEX_LISTS } from "./lists";
import { getBookIndexSourceIndependenceGroup } from "./sources";

/**
 * The public Book Index SEO gate needs only four readiness signals.
 *
 * Keep the same active composite-list filter, latest successful/no-change
 * snapshot, distinct external-book matching, and minimum per-source history
 * floor used by getBookIndexReadinessSnapshot(). The full readiness report
 * also loads canaries, collision diagnostics, unmatched samples and other
 * admin-only analysis. None of those belong on a public page request.
 *
 * This function is used inside the existing 30-second public evidence cache;
 * current book rankings and publication switches remain request-fresh.
 */
export async function getBookIndexPublicReadinessSnapshot() {
  const compositeRegistry = BOOK_INDEX_LISTS.filter(
    (list) => list.enabled && list.includeInComposite,
  );
  const compositeRegistryListCodes = compositeRegistry.map((list) => list.code);
  const compositeRegistrySourceCodes = [
    ...new Set(compositeRegistry.map((list) => list.sourceCode)),
  ];

  const persistedCompositeLists = await prisma.bookIndexList.findMany({
    where: {
      active: true,
      includeInComposite: true,
      code: { in: compositeRegistryListCodes },
      source: { includeInTurkeyIndex: true, status: "active" },
    },
    select: {
      id: true,
      source: { select: { code: true } },
      fetchRuns: {
        where: { status: { in: ["success", "no_change"] } },
        orderBy: { startedAt: "desc" },
        take: 1,
        select: {
          observations: {
            select: {
              externalBook: {
                select: { id: true, masterBookId: true },
              },
            },
          },
        },
      },
    },
  });

  const observedSourceCodes = new Set<string>();
  // Match the full readiness report: a book in two lists counts once, and
  // matching is based on whether the external book has a masterBookId.
  const latestCompositeBooks = new Map<string, boolean>();
  for (const list of persistedCompositeLists) {
    const latestRun = list.fetchRuns[0];
    if (!latestRun) continue;
    observedSourceCodes.add(list.source.code);
    for (const observation of latestRun.observations) {
      const book = observation.externalBook;
      latestCompositeBooks.set(book.id, Boolean(book.masterBookId));
    }
  }

  const observedCompositeIndependenceGroups = new Set(
    [...observedSourceCodes].map((code) =>
      getBookIndexSourceIndependenceGroup(code),
    ),
  ).size;
  let matchedCount = 0;
  for (const matched of latestCompositeBooks.values()) {
    if (matched) matchedCount++;
  }
  const latestCompositeMatchCoveragePercent = latestCompositeBooks.size
    ? Math.round((matchedCount / latestCompositeBooks.size) * 1000) / 10
    : 0;

  const runStats = persistedCompositeLists.length
    ? await prisma.bookIndexFetchRun.groupBy({
        by: ["listId"],
        where: {
          listId: { in: persistedCompositeLists.map((list) => list.id) },
          status: { in: ["success", "no_change"] },
        },
        _count: { _all: true },
        _min: { startedAt: true },
        _max: { startedAt: true },
      })
    : [];
  const statsByList = new Map(runStats.map((stats) => [stats.listId, stats]));
  const sourceHistory = new Map<
    string,
    { first: Date | null; last: Date | null }
  >();

  for (const list of persistedCompositeLists) {
    const stats = statsByList.get(list.id);
    if (!stats) continue;
    const source = list.source.code;
    const previous = sourceHistory.get(source);
    const first = stats._min.startedAt;
    const last = stats._max.startedAt;
    sourceHistory.set(source, {
      first:
        first && (!previous?.first || first < previous.first)
          ? first
          : (previous?.first ?? null),
      last:
        last && (!previous?.last || last > previous.last)
          ? last
          : (previous?.last ?? null),
    });
  }

  // Full readiness includes every enabled composite registry source in the
  // minimum. Missing source history contributes zero, never a false pass.
  const perSourceHistoryHours = compositeRegistrySourceCodes.map((source) => {
    const history = sourceHistory.get(source);
    if (!history?.first || !history.last) return 0;
    return Math.max(
      0,
      Math.round(
        ((history.last.getTime() - history.first.getTime()) / 3_600_000) * 10,
      ) / 10,
    );
  });

  return {
    observedCompositeSources: observedSourceCodes.size,
    observedCompositeIndependenceGroups,
    latestCompositeMatchCoveragePercent,
    minimumSourceHistorySpanHours: perSourceHistoryHours.length
      ? Math.min(...perSourceHistoryHours)
      : 0,
  };
}
