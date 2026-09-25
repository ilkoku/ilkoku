import { createHash } from "node:crypto";

import type { PrismaClient } from "@prisma/client";

import { normalizeBookIndexText } from "./html";

type BookIndexMatchDb = Pick<
  PrismaClient,
  "bookIndexBook" | "bookIndexExternalBook"
>;

export type BookIndexMatchCandidate = {
  id: string;
  title: string;
  authorName: string | null;
  publisherName: string | null;
  isbn13: string | null;
  isbn10: string | null;
  imageUrl: string | null;
  matchStatus: "unmatched" | "auto_matched" | "manual_matched" | "rejected";
  masterBookId: string | null;
};

function slugPart(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/ı/gu, "i")
    .replace(/İ/gu, "I")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 180);
}

function masterSlug(input: {
  title: string;
  isbn13: string | null;
  isbn10: string | null;
  normalizedTitle: string;
  normalizedAuthor: string | null;
}) {
  const identity =
    input.isbn13 ||
    input.isbn10 ||
    `${input.normalizedTitle}|${input.normalizedAuthor ?? ""}`;
  const digest = createHash("sha256").update(identity).digest("hex").slice(0, 12);
  return `${slugPart(input.title) || "kitap"}-${digest}`;
}

async function linkMaster(
  db: BookIndexMatchDb,
  externalBookId: string,
  masterBookId: string,
  confidence: number,
  seenAt: Date,
) {
  await db.bookIndexBook.update({
    where: { id: masterBookId },
    data: { lastSeenAt: seenAt },
  });

  await db.bookIndexExternalBook.update({
    where: { id: externalBookId },
    data: {
      masterBookId,
      matchStatus: "auto_matched",
      matchConfidence: confidence,
    },
  });

  return {
    matched: true as const,
    masterBookId,
    confidence,
  };
}

export async function autoMatchBookIndexExternalBook(
  db: BookIndexMatchDb,
  externalBook: BookIndexMatchCandidate,
  seenAt: Date,
) {
  if (
    externalBook.masterBookId ||
    externalBook.matchStatus === "manual_matched" ||
    externalBook.matchStatus === "rejected"
  ) {
    return {
      matched: Boolean(externalBook.masterBookId),
      masterBookId: externalBook.masterBookId,
      confidence: null,
    };
  }

  const normalizedTitle = normalizeBookIndexText(externalBook.title);
  const normalizedAuthor = externalBook.authorName
    ? normalizeBookIndexText(externalBook.authorName)
    : null;

  let existing:
    | {
        id: string;
      }
    | null = null;
  let confidence = 0;

  if (externalBook.isbn13) {
    existing = await db.bookIndexBook.findUnique({
      where: { isbn13: externalBook.isbn13 },
      select: { id: true },
    });
    confidence = 1;
  } else if (externalBook.isbn10) {
    existing = await db.bookIndexBook.findUnique({
      where: { isbn10: externalBook.isbn10 },
      select: { id: true },
    });
    confidence = 0.98;
  } else if (normalizedAuthor) {
    const candidates = await db.bookIndexBook.findMany({
      where: {
        normalizedTitle,
        normalizedAuthor,
      },
      select: { id: true },
      take: 2,
    });

    if (candidates.length > 1) {
      return {
        matched: false as const,
        masterBookId: null,
        confidence: null,
      };
    }

    existing = candidates[0] ?? null;
    confidence = 0.92;
  } else {
    return {
      matched: false as const,
      masterBookId: null,
      confidence: null,
    };
  }

  if (existing) {
    return linkMaster(
      db,
      externalBook.id,
      existing.id,
      confidence,
      seenAt,
    );
  }

  const master = await db.bookIndexBook.create({
    data: {
      slug: masterSlug({
        title: externalBook.title,
        isbn13: externalBook.isbn13,
        isbn10: externalBook.isbn10,
        normalizedTitle,
        normalizedAuthor,
      }),
      title: externalBook.title,
      normalizedTitle,
      authorName: externalBook.authorName,
      normalizedAuthor,
      publisherName: externalBook.publisherName,
      isbn13: externalBook.isbn13,
      isbn10: externalBook.isbn10,
      coverUrl: externalBook.imageUrl,
      firstSeenAt: seenAt,
      lastSeenAt: seenAt,
    },
    select: { id: true },
  });

  return linkMaster(
    db,
    externalBook.id,
    master.id,
    confidence,
    seenAt,
  );
}
