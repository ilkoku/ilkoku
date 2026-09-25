import type {
  BookIndexPublicReadModel,
  BookIndexSourceListSnapshot,
} from "./public-read-model";

export type BookIndexPublicSourcePageDefinition = {
  sourceCode: string;
  slug: string;
  sourceName: string;
  searchTitle: string;
};

export type BookIndexPublishedSourcePage = BookIndexPublicSourcePageDefinition & {
  lists: BookIndexSourceListSnapshot[];
  lastObservedAt: Date | null;
};

export const BOOK_INDEX_PUBLIC_SOURCE_PAGES: readonly BookIndexPublicSourcePageDefinition[] = [
  {
    sourceCode: "bkm",
    slug: "bkm-kitap",
    sourceName: "BKM Kitap",
    searchTitle: "BKM Kitap En Çok Satan Kitaplar",
  },
  {
    sourceCode: "remzi",
    slug: "remzi-kitabevi",
    sourceName: "Remzi Kitabevi",
    searchTitle: "Remzi Kitabevi En Çok Satan Kitaplar",
  },
  {
    sourceCode: "idefix",
    slug: "idefix",
    sourceName: "idefix",
    searchTitle: "idefix En Çok Satan Kitaplar",
  },
  {
    sourceCode: "kitapsepeti",
    slug: "kitapsepeti",
    sourceName: "KitapSepeti",
    searchTitle: "KitapSepeti En Çok Satan Kitaplar",
  },
  {
    sourceCode: "kitapzen",
    slug: "kitapzen",
    sourceName: "Kitapzen",
    searchTitle: "Kitapzen En Çok Satan Kitaplar",
  },
  {
    sourceCode: "inkilap",
    slug: "inkilap-kitabevi",
    sourceName: "İnkılâp Kitabevi",
    searchTitle: "İnkılâp Kitabevi En Çok Satan Kitaplar",
  },
  {
    sourceCode: "kitapsec",
    slug: "kitapsec",
    sourceName: "KitapSeç",
    searchTitle: "KitapSeç En Çok Satan Kitaplar",
  },
] as const;

const periodOrder = new Map([
  ["live", 0],
  ["weekly", 1],
  ["monthly", 2],
  ["yearly", 3],
]);

export function getBookIndexSourcePageBySlug(slug: string) {
  return BOOK_INDEX_PUBLIC_SOURCE_PAGES.find((page) => page.slug === slug) ?? null;
}

export function getBookIndexSourcePageByCode(sourceCode: string) {
  return BOOK_INDEX_PUBLIC_SOURCE_PAGES.find(
    (page) => page.sourceCode === sourceCode,
  ) ?? null;
}

export function getBookIndexAvailableSourceLists(
  model: BookIndexPublicReadModel,
  sourceCode: string,
) {
  return model.sourceLists
    .filter(
      (list) =>
        list.sourceCode === sourceCode
        && list.availability === "available"
        && list.items.length > 0,
    )
    .sort(
      (a, b) =>
        (periodOrder.get(a.period) ?? 99) - (periodOrder.get(b.period) ?? 99)
        || a.title.localeCompare(b.title, "tr"),
    );
}

function latestObservedAt(lists: readonly BookIndexSourceListSnapshot[]) {
  let latest: Date | null = null;

  for (const list of lists) {
    if (!list.observedAt) continue;
    if (!latest || list.observedAt.getTime() > latest.getTime()) {
      latest = list.observedAt;
    }
  }

  return latest;
}

export function getBookIndexPublishedSourcePages(
  model: BookIndexPublicReadModel,
): BookIndexPublishedSourcePage[] {
  return BOOK_INDEX_PUBLIC_SOURCE_PAGES.flatMap((definition) => {
    const lists = getBookIndexAvailableSourceLists(
      model,
      definition.sourceCode,
    );
    if (!lists.length) return [];

    return [{
      ...definition,
      lists,
      lastObservedAt: latestObservedAt(lists),
    }];
  });
}
