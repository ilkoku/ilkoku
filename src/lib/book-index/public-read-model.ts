import "server-only";

import { prisma } from "@/lib/prisma";

import { BOOK_INDEX_LISTS, getBookIndexList } from "./lists";
import { getTurkeyBookIndexPreview } from "./read-model";
import {
  BOOK_INDEX_SOURCES,
  getBookIndexSource,
  type BookIndexCollectionState,
  type BookIndexMarket,
} from "./sources";

export type BookIndexPublicAvailability =
  | "available"
  | "no_snapshot"
  | "researching"
  | "blocked"
  | "paused"
  | "unconfigured";

export type BookIndexSourceRankRow = {
  rank: number;
  title: string;
  authorName: string | null;
  publisherName: string | null;
  isbn13: string | null;
  isbn10: string | null;
  productUrl: string;
  imageUrl: string | null;
  priceAmount: bigint | null;
  currency: string | null;
  masterBookId: string | null;
};

export type BookIndexSourceListSnapshot = {
  listCode: string;
  sourceCode: string;
  sourceName: string;
  market: BookIndexMarket;
  title: string;
  categoryKey: string;
  period: string;
  sourceUrl: string;
  availability: BookIndexPublicAvailability;
  observedAt: Date | null;
  items: BookIndexSourceRankRow[];
};

export type BookIndexMarketSourceState = {
  sourceCode: string;
  sourceName: string;
  market: BookIndexMarket;
  collectionState: BookIndexCollectionState;
  availability: BookIndexPublicAvailability;
  configuredListCount: number;
  availableListCount: number;
};

export type BookIndexPublicReadModel = {
  publicRolloutState: "gated";
  turkey: {
    availability: "available" | "insufficient_data";
    items: Awaited<ReturnType<typeof getTurkeyBookIndexPreview>>;
  };
  amazonTr: BookIndexMarketSourceState;
  amazonUs: BookIndexMarketSourceState;
  sourceLists: BookIndexSourceListSnapshot[];
};

function availabilityFromCollectionState(
  state: BookIndexCollectionState,
): BookIndexPublicAvailability {
  switch (state) {
    case "blocked":
      return "blocked";
    case "paused":
      return "paused";
    case "researching":
      return "researching";
    default:
      return "no_snapshot";
  }
}

export async function getBookIndexSourceListSnapshot(
  listCode: string,
  limit = 100,
): Promise<BookIndexSourceListSnapshot | null> {
  const definition = getBookIndexList(listCode);
  if (!definition) return null;

  const sourceDefinition = getBookIndexSource(definition.sourceCode);
  if (!sourceDefinition) return null;

  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100);

  const persisted = await prisma.bookIndexList.findFirst({
    where: {
      code: definition.code,
      source: {
        code: definition.sourceCode,
      },
    },
    select: {
      id: true,
      active: true,
      source: {
        select: {
          status: true,
        },
      },
    },
  });

  if (!persisted || !persisted.active) {
    return {
      listCode: definition.code,
      sourceCode: sourceDefinition.code,
      sourceName: sourceDefinition.name,
      market: sourceDefinition.market,
      title: definition.title,
      categoryKey: definition.categoryKey,
      period: definition.period,
      sourceUrl: definition.sourceUrl,
      availability: availabilityFromCollectionState(
        sourceDefinition.collectionState,
      ),
      observedAt: null,
      items: [],
    };
  }

  if (persisted.source.status === "blocked") {
    return {
      listCode: definition.code,
      sourceCode: sourceDefinition.code,
      sourceName: sourceDefinition.name,
      market: sourceDefinition.market,
      title: definition.title,
      categoryKey: definition.categoryKey,
      period: definition.period,
      sourceUrl: definition.sourceUrl,
      availability: "blocked",
      observedAt: null,
      items: [],
    };
  }

  if (persisted.source.status === "paused") {
    return {
      listCode: definition.code,
      sourceCode: sourceDefinition.code,
      sourceName: sourceDefinition.name,
      market: sourceDefinition.market,
      title: definition.title,
      categoryKey: definition.categoryKey,
      period: definition.period,
      sourceUrl: definition.sourceUrl,
      availability: "paused",
      observedAt: null,
      items: [],
    };
  }

  const run = await prisma.bookIndexFetchRun.findFirst({
    where: {
      listId: persisted.id,
      status: { in: ["success", "no_change"] },
    },
    orderBy: {
      startedAt: "desc",
    },
    select: {
      startedAt: true,
      observations: {
        orderBy: {
          rank: "asc",
        },
        take: safeLimit,
        select: {
          rank: true,
          priceAmount: true,
          currency: true,
          externalBook: {
            select: {
              title: true,
              authorName: true,
              publisherName: true,
              isbn13: true,
              isbn10: true,
              productUrl: true,
              imageUrl: true,
              masterBookId: true,
            },
          },
        },
      },
    },
  });

  if (!run) {
    return {
      listCode: definition.code,
      sourceCode: sourceDefinition.code,
      sourceName: sourceDefinition.name,
      market: sourceDefinition.market,
      title: definition.title,
      categoryKey: definition.categoryKey,
      period: definition.period,
      sourceUrl: definition.sourceUrl,
      availability: availabilityFromCollectionState(
        sourceDefinition.collectionState,
      ),
      observedAt: null,
      items: [],
    };
  }

  return {
    listCode: definition.code,
    sourceCode: sourceDefinition.code,
    sourceName: sourceDefinition.name,
    market: sourceDefinition.market,
    title: definition.title,
    categoryKey: definition.categoryKey,
    period: definition.period,
    sourceUrl: definition.sourceUrl,
    availability: "available",
    observedAt: run.startedAt,
    items: run.observations.map((observation) => ({
      rank: observation.rank,
      title: observation.externalBook.title,
      authorName: observation.externalBook.authorName,
      publisherName: observation.externalBook.publisherName,
      isbn13: observation.externalBook.isbn13,
      isbn10: observation.externalBook.isbn10,
      productUrl: observation.externalBook.productUrl,
      imageUrl: observation.externalBook.imageUrl,
      priceAmount: observation.priceAmount,
      currency: observation.currency,
      masterBookId: observation.externalBook.masterBookId,
    })),
  };
}

async function getMarketSourceState(
  sourceCode: "amazon-tr" | "amazon-us",
  sourceLists: BookIndexSourceListSnapshot[],
): Promise<BookIndexMarketSourceState> {
  const source = getBookIndexSource(sourceCode);
  if (!source) {
    throw new Error(`BOOK_INDEX_PUBLIC_SOURCE_MISSING:${sourceCode}`);
  }

  const configuredLists = BOOK_INDEX_LISTS.filter(
    (list) => list.sourceCode === sourceCode && list.enabled,
  );
  const availableListCount = sourceLists.filter(
    (list) =>
      list.sourceCode === sourceCode && list.availability === "available",
  ).length;

  return {
    sourceCode: source.code,
    sourceName: source.name,
    market: source.market,
    collectionState: source.collectionState,
    availability:
      availableListCount > 0
        ? "available"
        : configuredLists.length === 0
          ? availabilityFromCollectionState(source.collectionState)
          : "no_snapshot",
    configuredListCount: configuredLists.length,
    availableListCount,
  };
}

export async function getBookIndexPublicReadModel(
  limit = 100,
): Promise<BookIndexPublicReadModel> {
  const enabledLists = BOOK_INDEX_LISTS.filter((list) => list.enabled);
  const [turkeyItems, sourceLists] = await Promise.all([
    getTurkeyBookIndexPreview(Math.min(limit, 100)),
    Promise.all(
      enabledLists.map((list) =>
        getBookIndexSourceListSnapshot(list.code, limit),
      ),
    ),
  ]);

  const nonNullSourceLists = sourceLists.filter(
    (list): list is BookIndexSourceListSnapshot => Boolean(list),
  );

  const [amazonTr, amazonUs] = await Promise.all([
    getMarketSourceState("amazon-tr", nonNullSourceLists),
    getMarketSourceState("amazon-us", nonNullSourceLists),
  ]);

  return {
    publicRolloutState: "gated",
    turkey: {
      availability: turkeyItems.length ? "available" : "insufficient_data",
      items: turkeyItems,
    },
    amazonTr,
    amazonUs,
    sourceLists: nonNullSourceLists,
  };
}

export function getBookIndexPublicSourceCatalog() {
  return BOOK_INDEX_SOURCES.map((source) => ({
    sourceCode: source.code,
    sourceName: source.name,
    market: source.market,
    collectionState: source.collectionState,
    includeInTurkeyIndex: source.includeInTurkeyIndex,
  }));
}
