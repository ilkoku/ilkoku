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

export type GlobalBestsellerSourceSnapshot = BookIndexSourceListSnapshot & {
  listCode: GlobalBestsellerListCode;
};

export type GlobalBestsellerReadModel = {
  availability: "available" | "partial" | "unavailable";
  availableSourceCount: number;
  configuredSourceCount: number;
  lists: GlobalBestsellerSourceSnapshot[];
};

function asGlobalSnapshot(
  value: BookIndexSourceListSnapshot | null,
): GlobalBestsellerSourceSnapshot | null {
  if (!value) return null;
  if (
    !GLOBAL_BESTSELLER_LIST_CODES.includes(
      value.listCode as GlobalBestsellerListCode,
    )
  ) {
    return null;
  }

  return value as GlobalBestsellerSourceSnapshot;
}

export async function getGlobalBestsellerReadModel(
  limit = 100,
): Promise<GlobalBestsellerReadModel> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100);

  const snapshots = await Promise.all(
    GLOBAL_BESTSELLER_LIST_CODES.map((listCode) =>
      getBookIndexSourceListSnapshot(listCode, safeLimit),
    ),
  );

  const lists = snapshots
    .map(asGlobalSnapshot)
    .filter(
      (snapshot): snapshot is GlobalBestsellerSourceSnapshot =>
        Boolean(snapshot),
    );

  const availableSourceCount = lists.filter(
    (list) => list.availability === "available",
  ).length;

  return {
    availability:
      availableSourceCount === GLOBAL_BESTSELLER_LIST_CODES.length
        ? "available"
        : availableSourceCount > 0
          ? "partial"
          : "unavailable",
    availableSourceCount,
    configuredSourceCount: GLOBAL_BESTSELLER_LIST_CODES.length,
    lists,
  };
}
