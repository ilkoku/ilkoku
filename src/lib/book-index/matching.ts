import { createHash } from "node:crypto";

import type { PrismaClient } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

import { normalizeBookIndexText } from "./html";

type BookIndexMatchDb = Pick<
  PrismaClient,
  "bookIndexBook" | "bookIndexExternalBook"
>;

type BookIndexMasterMatch = {
  id: string;
  isbn13: string | null;
  isbn10: string | null;
};

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

function isbnCompatible(
  externalBook: BookIndexMatchCandidate,
  master: BookIndexMasterMatch,
) {
  if (
    externalBook.isbn13 &&
    master.isbn13 &&
    externalBook.isbn13 !== master.isbn13
  ) {
    return false;
  }

  if (
    externalBook.isbn10 &&
    master.isbn10 &&
    externalBook.isbn10 !== master.isbn10
  ) {
    return false;
  }

  return true;
}

function hasExactIsbnIdentity(
  externalBook: BookIndexMatchCandidate,
  master: BookIndexMasterMatch,
) {
  return Boolean(
    (externalBook.isbn13 &&
      master.isbn13 &&
      externalBook.isbn13 === master.isbn13) ||
      (externalBook.isbn10 &&
        master.isbn10 &&
        externalBook.isbn10 === master.isbn10),
  );
}

function shouldRefreshMasterTitle(
  externalBook: BookIndexMatchCandidate,
  masterTitle: string,
) {
  const incomingTitle = normalizeBookIndexText(externalBook.title);
  const currentTitle = normalizeBookIndexText(masterTitle);

  if (!incomingTitle || incomingTitle === currentTitle) return false;
  if (!currentTitle.startsWith(`${incomingTitle} `)) return false;

  const appendedMetadata = currentTitle.slice(incomingTitle.length).trim();
  const verifiedParts = [externalBook.authorName, externalBook.publisherName]
    .filter((value): value is string => Boolean(value))
    .map((value) => normalizeBookIndexText(value))
    .filter(Boolean);

  return verifiedParts.some((part) => appendedMetadata.includes(part));
}

async function refreshAutoMatchedMasterMetadata(
  db: BookIndexMatchDb,
  externalBook: BookIndexMatchCandidate,
  masterBookId: string,
  seenAt: Date,
) {
  const master = await db.bookIndexBook.findUnique({
    where: { id: masterBookId },
    select: {
      id: true,
      title: true,
      authorName: true,
      publisherName: true,
      isbn13: true,
      isbn10: true,
    },
  });

  if (!master || !hasExactIsbnIdentity(externalBook, master)) return;

  const refreshTitle = shouldRefreshMasterTitle(externalBook, master.title);

  await db.bookIndexBook.update({
    where: { id: master.id },
    data: {
      lastSeenAt: seenAt,
      ...(refreshTitle
        ? {
            title: externalBook.title,
            normalizedTitle: normalizeBookIndexText(externalBook.title),
          }
        : {}),
      ...(!master.authorName && externalBook.authorName
        ? {
            authorName: externalBook.authorName,
            normalizedAuthor: normalizeBookIndexText(externalBook.authorName),
          }
        : {}),
      ...(!master.publisherName && externalBook.publisherName
        ? { publisherName: externalBook.publisherName }
        : {}),
    },
  });
}

async function linkMaster(
  db: BookIndexMatchDb,
  externalBook: BookIndexMatchCandidate,
  master: BookIndexMasterMatch,
  confidence: number,
  seenAt: Date,
) {
  await db.bookIndexBook.update({
    where: { id: master.id },
    data: {
      lastSeenAt: seenAt,
      ...(!master.isbn13 && externalBook.isbn13
        ? { isbn13: externalBook.isbn13 }
        : {}),
      ...(!master.isbn10 && externalBook.isbn10
        ? { isbn10: externalBook.isbn10 }
        : {}),
    },
  });

  await refreshAutoMatchedMasterMetadata(
    db,
    externalBook,
    master.id,
    seenAt,
  );

  await db.bookIndexExternalBook.update({
    where: { id: externalBook.id },
    data: {
      masterBookId: master.id,
      matchStatus: "auto_matched",
      matchConfidence: confidence,
    },
  });

  return {
    matched: true as const,
    masterBookId: master.id,
    confidence,
  };
}

export async function autoMatchBookIndexExternalBook(
  db: BookIndexMatchDb,
  externalBook: BookIndexMatchCandidate,
  seenAt: Date,
) {
  if (externalBook.masterBookId) {
    if (externalBook.matchStatus === "auto_matched") {
      await refreshAutoMatchedMasterMetadata(
        db,
        externalBook,
        externalBook.masterBookId,
        seenAt,
      );
    }

    return {
      matched: true,
      masterBookId: externalBook.masterBookId,
      confidence: null,
    };
  }

  if (
    externalBook.matchStatus === "manual_matched" ||
    externalBook.matchStatus === "rejected"
  ) {
    return {
      matched: false,
      masterBookId: null,
      confidence: null,
    };
  }

  const normalizedTitle = normalizeBookIndexText(externalBook.title);
  const normalizedAuthor = externalBook.authorName
    ? normalizeBookIndexText(externalBook.authorName)
    : null;

  let existing: BookIndexMasterMatch | null = null;
  let confidence = 0;

  if (externalBook.isbn13) {
    existing = await db.bookIndexBook.findUnique({
      where: { isbn13: externalBook.isbn13 },
      select: { id: true, isbn13: true, isbn10: true },
    });

    if (existing) confidence = 1;
  }

  if (!existing && externalBook.isbn10) {
    existing = await db.bookIndexBook.findUnique({
      where: { isbn10: externalBook.isbn10 },
      select: { id: true, isbn13: true, isbn10: true },
    });

    if (existing) confidence = 0.98;
  }

  if (!existing && normalizedAuthor) {
    const candidates = await db.bookIndexBook.findMany({
      where: {
        normalizedTitle,
        normalizedAuthor,
      },
      select: {
        id: true,
        isbn13: true,
        isbn10: true,
      },
      take: 3,
    });

    const compatibleCandidates = candidates.filter((candidate) =>
      isbnCompatible(externalBook, candidate),
    );

    if (compatibleCandidates.length > 1) {
      return {
        matched: false as const,
        masterBookId: null,
        confidence: null,
      };
    }

    existing = compatibleCandidates[0] ?? null;
    if (existing) confidence = 0.92;
  }

  if (
    !existing &&
    !externalBook.isbn13 &&
    !externalBook.isbn10 &&
    !normalizedAuthor
  ) {
    return {
      matched: false as const,
      masterBookId: null,
      confidence: null,
    };
  }

  if (existing) {
    return linkMaster(
      db,
      externalBook,
      existing,
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
    select: {
      id: true,
      isbn13: true,
      isbn10: true,
    },
  });

  return linkMaster(
    db,
    externalBook,
    master,
    confidence,
    seenAt,
  );
}

export async function matchPendingBookIndexBooks(limit = 200) {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 500);
  const candidates = await prisma.bookIndexExternalBook.findMany({
    where: {
      masterBookId: null,
      matchStatus: "unmatched",
    },
    orderBy: { lastSeenAt: "desc" },
    take: safeLimit,
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
      lastSeenAt: true,
    },
  });

  let matched = 0;
  let pending = 0;

  for (const candidate of candidates) {
    const result = await prisma.$transaction((transaction) =>
      autoMatchBookIndexExternalBook(
        transaction,
        candidate,
        candidate.lastSeenAt,
      ),
    );

    if (result.matched) matched += 1;
    else pending += 1;
  }

  return {
    processed: candidates.length,
    matched,
    pending,
  };
}
