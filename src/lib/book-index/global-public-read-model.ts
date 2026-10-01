import "server-only";

import { prisma } from "@/lib/prisma";

import { normalizeBookIndexText } from "./html";
import { getBookIndexTurkishTitleMeaning } from "./turkish-title-meanings";
import {
  getBookIndexSourceListSnapshot,
  type BookIndexSourceListSnapshot,
  type BookIndexSourceRankRow,
} from "./public-read-model";

export const GLOBAL_BESTSELLER_LIST_CODES = [
  "amazon-us-live",
  "amazon-uk-live",
  "ibs-it-daily",
  "rakuten-jp-weekly",
  "kyobo-kr-weekly",
  "readings-au-monthly",
  "spiegel-de-fiction-hardcover-weekly",
  "amazon-fr-live",
  "amazon-es-live",
  "abc-gfk-es-fiction-weekly",
  "amazon-ca-live",
  "amazon-br-live",
  "bestseller60-nl-weekly",
  "kirjakauppaliitto-fi-monthly",
  "pubhub-dk-ebooks-weekly",
  "forlaggare-se-fiction-weekly",
  "globe-mail-ca-hardcover-fiction-weekly",
] as const;

export type GlobalBestsellerListCode =
  (typeof GLOBAL_BESTSELLER_LIST_CODES)[number];

export type GlobalBestsellerItem = BookIndexSourceRankRow & {
  turkishTitle: string | null;
  turkishTitleKind: "publication" | "meaning" | null;
};

export type GlobalBestsellerList = Omit<BookIndexSourceListSnapshot, "items"> & {
  items: GlobalBestsellerItem[];
};

export type GlobalBestsellerReadModel = {
  rolloutState: "public";
  lists: GlobalBestsellerList[];
  availableListCount: number;
  latestObservedAt: Date | null;
};

export async function getGlobalBestsellerReadModel(
  limit = 100,
): Promise<GlobalBestsellerReadModel> {
  const snapshots = await Promise.all(
    GLOBAL_BESTSELLER_LIST_CODES.map((listCode) =>
      getBookIndexSourceListSnapshot(listCode, limit),
    ),
  );

  const sourceLists = snapshots.filter(
    (snapshot): snapshot is BookIndexSourceListSnapshot => Boolean(snapshot),
  );

  const masterBookIds = [
    ...new Set(
      sourceLists
        .flatMap((list) => list.items)
        .map((item) => item.masterBookId)
        .filter((value): value is string => Boolean(value)),
    ),
  ];

  const turkishCandidates = masterBookIds.length
    ? await prisma.bookIndexExternalBook.findMany({
        where: {
          masterBookId: { in: masterBookIds },
          source: {
            marketCode: "TR",
            includeInTurkeyIndex: true,
          },
        },
        orderBy: [{ lastSeenAt: "desc" }],
        select: {
          masterBookId: true,
          title: true,
          normalizedTitle: true,
        },
      })
    : [];

  const turkishTitleByMasterBookId = new Map<string, string>();
  for (const candidate of turkishCandidates) {
    if (!candidate.masterBookId || turkishTitleByMasterBookId.has(candidate.masterBookId)) {
      continue;
    }
    turkishTitleByMasterBookId.set(candidate.masterBookId, candidate.title);
  }

  const lists: GlobalBestsellerList[] = sourceLists.map((list) => ({
    ...list,
    items: list.items.map((item) => {
      const candidate = item.masterBookId
        ? turkishTitleByMasterBookId.get(item.masterBookId) ?? null
        : null;
      const verifiedPublicationTitle =
        candidate && normalizeBookIndexText(candidate) !== normalizeBookIndexText(item.title)
          ? candidate
          : null;
      const turkishMeaning = verifiedPublicationTitle
        ? null
        : getBookIndexTurkishTitleMeaning(item.title);
      const turkishTitle = verifiedPublicationTitle ?? turkishMeaning;
      const turkishTitleKind = verifiedPublicationTitle
        ? ("publication" as const)
        : turkishMeaning
          ? ("meaning" as const)
          : null;

      return { ...item, turkishTitle, turkishTitleKind };
    }),
  }));

  const latestObservedAt = lists.reduce<Date | null>((latest, list) => {
    if (!list.observedAt) return latest;
    if (!latest || list.observedAt.getTime() > latest.getTime()) {
      return list.observedAt;
    }
    return latest;
  }, null);

  return {
    rolloutState: "public",
    lists,
    availableListCount: lists.filter(
      (list) => list.availability === "available",
    ).length,
    latestObservedAt,
  };
}
