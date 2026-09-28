import type { BookIndexPublicReadModel } from "./public-read-model";
import type { TurkeySourceRankRow } from "./source-rank-table";

export function getBookIndexLastObservedAt(
  model: BookIndexPublicReadModel,
): Date | null {
  let latest: Date | null = null;

  for (const list of model.sourceLists) {
    if (!list.observedAt) continue;
    if (!latest || list.observedAt.getTime() > latest.getTime()) {
      latest = list.observedAt;
    }
  }

  return latest;
}

export function createBookIndexItemListSchema({
  name,
  url,
  items,
}: {
  name: string;
  url: string;
  items: readonly TurkeySourceRankRow[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    url,
    numberOfItems: items.length,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    itemListElement: items.map((book, index) => ({
      "@type": "ListItem",
      position: book.rank,
      item: {
        "@type": "Book",
        name: book.title,
        ...(book.authorName
          ? {
              author: {
                "@type": "Person",
                name: book.authorName,
              },
            }
          : {}),
      },
    })),
  };
}


export function createBookIndexGenericItemListSchema({
  name,
  url,
  items,
}: {
  name: string;
  url: string;
  items: readonly { title: string; authorName: string | null }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    url,
    numberOfItems: items.length,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    itemListElement: items.map((book, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Book",
        name: book.title,
        ...(book.authorName
          ? {
              author: {
                "@type": "Person",
                name: book.authorName,
              },
            }
          : {}),
      },
    })),
  };
}
