import { createHash } from "node:crypto";

import { prisma } from "@/lib/prisma";

import type {
  BookIndexCollectionResult,
  BookIndexSourceAdapter,
} from "./adapter";
import { normalizeBookIndexText } from "./html";
import { autoMatchBookIndexExternalBook } from "./matching";
import { getBookIndexList } from "./lists";
import { getBookIndexSource } from "./sources";
import { bkmBookIndexAdapter } from "./sources/bkm";
import { kitapSepetiBookIndexAdapter } from "./sources/kitapsepeti";
import { kitapSecBookIndexAdapter } from "./sources/kitapsec";
import { inkilapBookIndexAdapter } from "./sources/inkilap";
import { illaKitapBookIndexAdapter } from "./sources/illakitap";
import { kitapzenBookIndexAdapter } from "./sources/kitapzen";
import { idefixBookIndexAdapter } from "./sources/idefix";
import { remziBookIndexAdapter } from "./sources/remzi";

const adapters = new Map<string, BookIndexSourceAdapter>([
  [remziBookIndexAdapter.sourceCode, remziBookIndexAdapter],
  [bkmBookIndexAdapter.sourceCode, bkmBookIndexAdapter],
  [kitapSepetiBookIndexAdapter.sourceCode, kitapSepetiBookIndexAdapter],
  [kitapSecBookIndexAdapter.sourceCode, kitapSecBookIndexAdapter],
  [inkilapBookIndexAdapter.sourceCode, inkilapBookIndexAdapter],
  [illaKitapBookIndexAdapter.sourceCode, illaKitapBookIndexAdapter],
  [kitapzenBookIndexAdapter.sourceCode, kitapzenBookIndexAdapter],
  [idefixBookIndexAdapter.sourceCode, idefixBookIndexAdapter],
]);

function fingerprint(result: BookIndexCollectionResult) {
  const canonical = result.books.map((book) => ({
    sourceKey: book.sourceKey,
    rank: book.rank,
    title: book.title,
    authorName: book.authorName ?? null,
    publisherName: book.publisherName ?? null,
  }));

  return createHash("sha256")
    .update(JSON.stringify(canonical))
    .digest("hex");
}

function safeErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message.slice(0, 900);
  return "BOOK_INDEX_UNKNOWN_ERROR";
}

export async function bootstrapBookIndexList(listCode: string) {
  const listDefinition = getBookIndexList(listCode);
  if (!listDefinition) throw new Error("BOOK_INDEX_LIST_NOT_FOUND");

  const sourceDefinition = getBookIndexSource(listDefinition.sourceCode);
  if (!sourceDefinition) throw new Error("BOOK_INDEX_SOURCE_NOT_FOUND");

  const source = await prisma.bookIndexSource.upsert({
    where: { code: sourceDefinition.code },
    create: {
      code: sourceDefinition.code,
      name: sourceDefinition.name,
      marketCode: sourceDefinition.market,
      countryCode: sourceDefinition.countryCode,
      baseUrl: sourceDefinition.baseUrl,
      includeInTurkeyIndex: sourceDefinition.includeInTurkeyIndex,
      status: sourceDefinition.collectionState === "blocked" ? "blocked" : "active",
    },
    update: {
      name: sourceDefinition.name,
      marketCode: sourceDefinition.market,
      countryCode: sourceDefinition.countryCode,
      baseUrl: sourceDefinition.baseUrl,
      includeInTurkeyIndex: sourceDefinition.includeInTurkeyIndex,
      status: sourceDefinition.collectionState === "blocked" ? "blocked" : "active",
    },
  });

  const list = await prisma.bookIndexList.upsert({
    where: {
      sourceId_code: {
        sourceId: source.id,
        code: listDefinition.code,
      },
    },
    create: {
      sourceId: source.id,
      code: listDefinition.code,
      title: listDefinition.title,
      categoryKey: listDefinition.categoryKey,
      period: listDefinition.period,
      sourceUrl: listDefinition.sourceUrl,
      maxRank: listDefinition.maxRank,
      includeInComposite: listDefinition.includeInComposite,
      collectionEveryMinutes: listDefinition.collectionEveryMinutes,
      active: listDefinition.enabled,
    },
    update: {
      title: listDefinition.title,
      categoryKey: listDefinition.categoryKey,
      period: listDefinition.period,
      sourceUrl: listDefinition.sourceUrl,
      maxRank: listDefinition.maxRank,
      includeInComposite: listDefinition.includeInComposite,
      collectionEveryMinutes: listDefinition.collectionEveryMinutes,
      active: listDefinition.enabled,
    },
  });

  return { source, list, listDefinition };
}

export async function collectBookIndexListByCode(listCode: string) {
  const { source, list, listDefinition } =
    await bootstrapBookIndexList(listCode);

  const adapter = adapters.get(source.code);
  if (!adapter) throw new Error("BOOK_INDEX_ADAPTER_NOT_READY");
  if (!list.active) throw new Error("BOOK_INDEX_LIST_INACTIVE");
  if (source.status !== "active") throw new Error("BOOK_INDEX_SOURCE_INACTIVE");

  const startedAt = new Date();
  const run = await prisma.bookIndexFetchRun.create({
    data: {
      listId: list.id,
      status: "running",
      startedAt,
    },
  });

  try {
    const result = await adapter.collect({
      listCode: list.code,
      sourceUrl: list.sourceUrl,
      observedAt: startedAt,
    });

    if (result.books.length === 0) {
      throw new Error("BOOK_INDEX_EMPTY_RESULT");
    }

    const maxRank = list.maxRank;
    if (
      maxRank !== null &&
      result.books.some((book) => book.rank > maxRank)
    ) {
      throw new Error("BOOK_INDEX_RANK_EXCEEDS_LIST_LIMIT");
    }

    const digest = result.sourceFingerprint ?? fingerprint(result);
    const previous = await prisma.bookIndexFetchRun.findFirst({
      where: {
        listId: list.id,
        id: { not: run.id },
        status: { in: ["success", "no_change"] },
      },
      orderBy: { startedAt: "desc" },
      select: { fingerprint: true },
    });
    const unchanged = previous?.fingerprint === digest;

    await prisma.$transaction(async (transaction) => {
      for (const book of result.books) {
        const externalBook = await transaction.bookIndexExternalBook.upsert({
          where: {
            sourceId_sourceKey: {
              sourceId: source.id,
              sourceKey: book.sourceKey,
            },
          },
          create: {
            sourceId: source.id,
            sourceKey: book.sourceKey,
            sourceExternalId: book.sourceExternalId ?? null,
            title: book.title,
            normalizedTitle: normalizeBookIndexText(book.title),
            authorName: book.authorName ?? null,
            normalizedAuthor: book.authorName
              ? normalizeBookIndexText(book.authorName)
              : null,
            publisherName: book.publisherName ?? null,
            isbn13: book.isbn13 ?? null,
            isbn10: book.isbn10 ?? null,
            productUrl: book.productUrl,
            imageUrl: book.imageUrl ?? null,
            lastSeenAt: startedAt,
          },
          update: {
            sourceExternalId: book.sourceExternalId ?? null,
            title: book.title,
            normalizedTitle: normalizeBookIndexText(book.title),
            authorName: book.authorName ?? null,
            normalizedAuthor: book.authorName
              ? normalizeBookIndexText(book.authorName)
              : null,
            publisherName: book.publisherName ?? null,
            isbn13: book.isbn13 ?? null,
            isbn10: book.isbn10 ?? null,
            productUrl: book.productUrl,
            imageUrl: book.imageUrl ?? null,
            lastSeenAt: startedAt,
          },
          select: {
            id: true,
            title: true,
            authorName: true,
            publisherName: true,
            isbn13: true,
            isbn10: true,
            imageUrl: true,
            matchStatus: true,
            masterBookId: true,
          },
        });

        await autoMatchBookIndexExternalBook(
          transaction,
          externalBook,
          startedAt,
        );

        await transaction.bookIndexObservation.create({
          data: {
            fetchRunId: run.id,
            externalBookId: externalBook.id,
            rank: book.rank,
            priceAmount: book.priceAmount ?? null,
            currency: book.currency ?? null,
            observedAt: startedAt,
          },
        });
      }

      await transaction.bookIndexFetchRun.update({
        where: { id: run.id },
        data: {
          status: unchanged ? "no_change" : "success",
          completedAt: new Date(),
          itemsFound: result.books.length,
          itemsStored: result.books.length,
          fingerprint: digest,
          errorCode: null,
          errorMessage: null,
        },
      });
    });

    return {
      listCode: listDefinition.code,
      sourceCode: source.code,
      status: unchanged ? ("no_change" as const) : ("success" as const),
      items: result.books.length,
    };
  } catch (error) {
    const message = safeErrorMessage(error);

    await prisma.bookIndexFetchRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        completedAt: new Date(),
        errorCode: message.match(/^BOOK_INDEX_[A-Z0-9_]+$/u)?.[0] ?? "BOOK_INDEX_COLLECT_FAILED",
        errorMessage: message,
      },
    });

    throw error;
  }
}
