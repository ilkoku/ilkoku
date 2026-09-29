import "server-only";

import {
  getBookIndexSourceListSnapshot,
  type BookIndexSourceListSnapshot,
} from "./public-read-model";

export const GLOBAL_BESTSELLER_LIST_CODES = [
  "amazon-us-live",
  "amazon-uk-live",
  "ibs-it-daily",
  "rakuten-jp-weekly",
  "kyobo-kr-weekly",
  "readings-au-monthly",
] as const;

export type GlobalBestsellerListCode =
  (typeof GLOBAL_BESTSELLER_LIST_CODES)[number];

export type GlobalBestsellerReadModel = {
  rolloutState: "public";
  lists: BookIndexSourceListSnapshot[];
  availableListCount: number;
  latestObservedAt: Date | null;
};

export function isGlobalBestsellerPreviewEnabled(
  env: NodeJS.ProcessEnv = process.env,
) {
  return env.BOOK_INDEX_GLOBAL_PREVIEW_ENABLED === "true";
}

export async function getGlobalBestsellerReadModel(
  limit = 100,
): Promise<GlobalBestsellerReadModel> {
  const snapshots = await Promise.all(
    GLOBAL_BESTSELLER_LIST_CODES.map((listCode) =>
      getBookIndexSourceListSnapshot(listCode, limit),
    ),
  );

  const lists = snapshots.filter(
    (snapshot): snapshot is BookIndexSourceListSnapshot => Boolean(snapshot),
  );

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
