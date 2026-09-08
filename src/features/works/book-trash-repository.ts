import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";

import {
  bookSectionDetails,
  isBookSectionKind,
  type BookSectionKind,
  type SpecialBookSectionKind,
} from "./book-structure";
import type { BookTrashItem } from "./book-trash";

type TrashRow = {
  id: string;
  structureItemId: string;
  chapterId: string | null;
  kind: string;
  title: string;
  content: string;
  originalPosition: number;
  isAutomatic: boolean | number;
  trashedAt: Date;
};

type ActiveStructureRow = {
  id: string;
  chapterId: string | null;
  kind: string;
  title: string | null;
  content: string | null;
  position: number;
  isAutomatic: boolean | number;
  chapterTitle: string | null;
  chapterContent: string | null;
  chapterArchivedAt: Date | null;
};

function countWords(value: string) {
  const normalized = value.trim();
  return normalized ? normalized.split(/\s+/u).length : 0;
}

function mapTrashRow(row: TrashRow): BookTrashItem {
  const kind: BookSectionKind = isBookSectionKind(row.kind) ? row.kind : "chapter";

  return {
    id: row.id,
    structureItemId: row.structureItemId,
    chapterId: row.chapterId,
    kind,
    title: row.title.trim() || bookSectionDetails[kind].defaultTitle,
    content: row.content,
    originalPosition: row.originalPosition,
    isAutomatic: Boolean(row.isAutomatic),
    trashedAt: row.trashedAt.toISOString(),
    wordCount: countWords(row.content),
  };
}

async function markWorkDraft(
  transaction: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  workId: string,
) {
  await transaction.work.update({
    where: { id: workId },
    data: {
      publishedAt: null,
      status: "draft",
      visibility: "private",
    },
  });
}

async function compactPositionsAfterRemoval(
  transaction: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  authorId: string,
  workId: string,
  removedPosition: number,
) {
  await transaction.$executeRaw`
    UPDATE BookStructureItem
    SET position = position + 1000000
    WHERE workId = ${workId}
      AND authorId = ${authorId}
      AND position > ${removedPosition}
  `;

  await transaction.$executeRaw`
    UPDATE BookStructureItem
    SET position = position - 1000001
    WHERE workId = ${workId}
      AND authorId = ${authorId}
      AND position > 1000000
  `;
}

async function openPositionForRestore(
  transaction: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  authorId: string,
  workId: string,
  position: number,
) {
  await transaction.$executeRaw`
    UPDATE BookStructureItem
    SET position = position + 1000000
    WHERE workId = ${workId}
      AND authorId = ${authorId}
      AND position >= ${position}
  `;

  await transaction.$executeRaw`
    UPDATE BookStructureItem
    SET position = position - 999999
    WHERE workId = ${workId}
      AND authorId = ${authorId}
      AND position >= ${position + 1000000}
  `;
}

export async function getBookTrash(authorId: string, workId: string) {
  const rows = await prisma.$queryRaw<TrashRow[]>`
    SELECT
      id,
      structureItemId,
      chapterId,
      kind,
      title,
      content,
      originalPosition,
      isAutomatic,
      trashedAt
    FROM BookTrashItem
    WHERE workId = ${workId}
      AND authorId = ${authorId}
    ORDER BY trashedAt DESC
  `;

  return rows.map(mapTrashRow);
}

export async function hasTrashedBookSectionKind(
  authorId: string,
  workId: string,
  kind: SpecialBookSectionKind,
) {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM BookTrashItem
    WHERE workId = ${workId}
      AND authorId = ${authorId}
      AND kind = ${kind}
      AND chapterId IS NULL
    LIMIT 1
  `;

  return Boolean(rows[0]);
}

export async function getBookTemplateContext(authorId: string, workId: string) {
  const rows = await prisma.$queryRaw<
    Array<{ title: string; fullName: string; displayName: string | null }>
  >`
    SELECT work.title, user.fullName, user.displayName
    FROM Work AS work
    INNER JOIN User AS user ON user.id = work.authorId
    WHERE work.id = ${workId}
      AND work.authorId = ${authorId}
    LIMIT 1
  `;
  const row = rows[0];

  if (!row) {
    throw new Error("Eser bulunamadı veya şablon oluşturma yetkin yok.");
  }

  return {
    workTitle: row.title,
    authorName: row.displayName?.trim() || row.fullName.trim(),
  };
}

export async function moveBookStructureItemToTrash(
  authorId: string,
  workId: string,
  structureItemId: string,
) {
  await prisma.$transaction(async (transaction) => {
    const ownedWork = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM Work
      WHERE id = ${workId}
        AND authorId = ${authorId}
      LIMIT 1
      FOR UPDATE
    `;

    if (!ownedWork[0]) {
      throw new Error("Eser bulunamadı veya bu öğeyi silme yetkin yok.");
    }

    const rows = await transaction.$queryRaw<ActiveStructureRow[]>`
      SELECT
        structureItem.id,
        structureItem.chapterId,
        structureItem.kind,
        structureItem.title,
        structureItem.content,
        structureItem.position,
        structureItem.isAutomatic,
        chapter.title AS chapterTitle,
        chapter.content AS chapterContent,
        chapter.archivedAt AS chapterArchivedAt
      FROM BookStructureItem AS structureItem
      LEFT JOIN Chapter AS chapter ON chapter.id = structureItem.chapterId
      WHERE structureItem.id = ${structureItemId}
        AND structureItem.workId = ${workId}
        AND structureItem.authorId = ${authorId}
      LIMIT 1
      FOR UPDATE
    `;
    const item = rows[0];

    if (!item) {
      throw new Error("Silinecek kitap öğesi bulunamadı.");
    }

    if (item.chapterId) {
      if (item.chapterArchivedAt) {
        throw new Error("Bu bölüm zaten çöp kutusunda.");
      }

      const activeChapterCount = await transaction.$queryRaw<Array<{ total: bigint }>>`
        SELECT COUNT(*) AS total
        FROM Chapter
        WHERE workId = ${workId}
          AND authorId = ${authorId}
          AND archivedAt IS NULL
      `;

      if (Number(activeChapterCount[0]?.total ?? 0) <= 1) {
        throw new Error("Eserde en az bir ana bölüm kalmalıdır.");
      }
    }

    const kind: BookSectionKind = isBookSectionKind(item.kind) ? item.kind : "chapter";
    const title = item.chapterId
      ? item.chapterTitle?.trim() || bookSectionDetails.chapter.defaultTitle
      : item.title?.trim() || bookSectionDetails[kind].defaultTitle;
    const content = item.chapterId ? item.chapterContent ?? "" : item.content ?? "";

    await transaction.$executeRaw`
      INSERT INTO BookTrashItem (
        id,
        workId,
        authorId,
        structureItemId,
        chapterId,
        kind,
        title,
        content,
        originalPosition,
        isAutomatic,
        trashedAt,
        createdAt
      ) VALUES (
        ${randomUUID()},
        ${workId},
        ${authorId},
        ${item.id},
        ${item.chapterId},
        ${kind},
        ${title},
        ${content},
        ${item.position},
        ${Boolean(item.isAutomatic)},
        CURRENT_TIMESTAMP(3),
        CURRENT_TIMESTAMP(3)
      )
    `;

    if (item.chapterId) {
      await transaction.chapter.update({
        where: { id: item.chapterId },
        data: {
          archivedAt: new Date(),
          publishedAt: null,
          status: "archived",
        },
      });
    }

    await transaction.$executeRaw`
      DELETE FROM BookStructureItem
      WHERE id = ${item.id}
        AND workId = ${workId}
        AND authorId = ${authorId}
    `;

    await compactPositionsAfterRemoval(
      transaction,
      authorId,
      workId,
      item.position,
    );
    await markWorkDraft(transaction, workId);
  });

  return getBookTrash(authorId, workId);
}

export async function restoreBookTrashItem(
  authorId: string,
  workId: string,
  trashItemId: string,
) {
  await prisma.$transaction(async (transaction) => {
    const rows = await transaction.$queryRaw<TrashRow[]>`
      SELECT
        trash.id,
        trash.structureItemId,
        trash.chapterId,
        trash.kind,
        trash.title,
        trash.content,
        trash.originalPosition,
        trash.isAutomatic,
        trash.trashedAt
      FROM BookTrashItem AS trash
      INNER JOIN Work AS work ON work.id = trash.workId
      WHERE trash.id = ${trashItemId}
        AND trash.workId = ${workId}
        AND trash.authorId = ${authorId}
        AND work.authorId = ${authorId}
      LIMIT 1
      FOR UPDATE
    `;
    const item = rows[0];

    if (!item) {
      throw new Error("Geri yüklenecek öğe çöp kutusunda bulunamadı.");
    }

    if (!item.chapterId) {
      const duplicate = await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM BookStructureItem
        WHERE workId = ${workId}
          AND authorId = ${authorId}
          AND kind = ${item.kind}
        LIMIT 1
      `;

      if (duplicate[0]) {
        throw new Error("Bu sayfa türü kitap yapısında zaten var. Önce aktif olan sayfayı kaldırmalısın.");
      }
    }

    const maxRows = await transaction.$queryRaw<Array<{ position: number | null }>>`
      SELECT MAX(position) AS position
      FROM BookStructureItem
      WHERE workId = ${workId}
        AND authorId = ${authorId}
    `;
    const maxPosition = Number(maxRows[0]?.position ?? 0);
    const restorePosition = Math.max(
      1,
      Math.min(item.originalPosition, maxPosition + 1),
    );

    await openPositionForRestore(
      transaction,
      authorId,
      workId,
      restorePosition,
    );

    if (item.chapterId) {
      const chapter = await transaction.chapter.findFirst({
        where: {
          id: item.chapterId,
          workId,
          authorId,
        },
        select: { id: true },
      });

      if (!chapter) {
        throw new Error("Geri yüklenecek bölüm artık bulunamıyor.");
      }

      await transaction.chapter.update({
        where: { id: item.chapterId },
        data: {
          archivedAt: null,
          publishedAt: null,
          status: "draft",
        },
      });

      await transaction.$executeRaw`
        INSERT INTO BookStructureItem (
          id,
          workId,
          authorId,
          chapterId,
          kind,
          title,
          content,
          position,
          isAutomatic,
          createdAt,
          updatedAt
        ) VALUES (
          ${item.structureItemId},
          ${workId},
          ${authorId},
          ${item.chapterId},
          'chapter',
          NULL,
          NULL,
          ${restorePosition},
          false,
          CURRENT_TIMESTAMP(3),
          CURRENT_TIMESTAMP(3)
        )
      `;
    } else {
      await transaction.$executeRaw`
        INSERT INTO BookStructureItem (
          id,
          workId,
          authorId,
          chapterId,
          kind,
          title,
          content,
          position,
          isAutomatic,
          createdAt,
          updatedAt
        ) VALUES (
          ${item.structureItemId},
          ${workId},
          ${authorId},
          NULL,
          ${item.kind},
          ${item.title},
          ${item.content},
          ${restorePosition},
          ${Boolean(item.isAutomatic)},
          CURRENT_TIMESTAMP(3),
          CURRENT_TIMESTAMP(3)
        )
      `;
    }

    await transaction.$executeRaw`
      DELETE FROM BookTrashItem
      WHERE id = ${item.id}
        AND workId = ${workId}
        AND authorId = ${authorId}
    `;

    await markWorkDraft(transaction, workId);
  });

  return getBookTrash(authorId, workId);
}

export async function emptyBookTrash(authorId: string, workId: string) {
  await prisma.$transaction(async (transaction) => {
    const ownedWork = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM Work
      WHERE id = ${workId}
        AND authorId = ${authorId}
      LIMIT 1
      FOR UPDATE
    `;

    if (!ownedWork[0]) {
      throw new Error("Eser bulunamadı veya çöp kutusunu boşaltma yetkin yok.");
    }

    const rows = await transaction.$queryRaw<Array<{ chapterId: string | null }>>`
      SELECT chapterId
      FROM BookTrashItem
      WHERE workId = ${workId}
        AND authorId = ${authorId}
      FOR UPDATE
    `;
    const chapterIds = rows
      .map((row) => row.chapterId)
      .filter((value): value is string => Boolean(value));

    if (chapterIds.length) {
      await transaction.chapter.deleteMany({
        where: {
          id: { in: chapterIds },
          workId,
          authorId,
          archivedAt: { not: null },
        },
      });
    }

    await transaction.$executeRaw`
      DELETE FROM BookTrashItem
      WHERE workId = ${workId}
        AND authorId = ${authorId}
    `;

    await markWorkDraft(transaction, workId);
  });
}
