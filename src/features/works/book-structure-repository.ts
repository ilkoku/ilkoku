import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";

import {
  bookSectionDetails,
  isBookSectionKind,
  tableOfContentsIncludedKinds,
  type BookSectionKind,
  type BookStructureItem,
  type SpecialBookSectionKind,
} from "./book-structure";

type StructureRow = {
  id: string;
  chapterId: string | null;
  chapterPosition: number | null;
  kind: string;
  title: string | null;
  content: string | null;
  position: number;
  isAutomatic: boolean | number;
  updatedAt: Date;
};

type PublicationChapterOverride = {
  chapterId: string;
  title: string;
};

function countWords(value: string) {
  const normalized = value.trim();

  return normalized ? normalized.split(/\s+/u).length : 0;
}

function mapStructureRow(row: StructureRow): BookStructureItem {
  const kind: BookSectionKind = isBookSectionKind(row.kind)
    ? row.kind
    : "chapter";
  const title = row.title?.trim() || bookSectionDetails[kind].defaultTitle;
  const content = row.content ?? "";

  return {
    id: row.id,
    chapterId: row.chapterId,
    chapterPosition: row.chapterPosition,
    kind,
    title,
    content,
    position: row.position,
    isAutomatic: Boolean(row.isAutomatic),
    updatedAt: row.updatedAt.toISOString(),
    wordCount: countWords(content),
  };
}

async function ensureChapterStructureItems(authorId: string, workId: string) {
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
      throw new Error("Eser bulunamadı veya kitap yapısını düzenleme yetkin yok.");
    }

    const currentMax = await transaction.$queryRaw<Array<{ position: number | null }>>`
      SELECT MAX(position) AS position
      FROM BookStructureItem
      WHERE workId = ${workId}
        AND authorId = ${authorId}
    `;
    const missingChapters = await transaction.$queryRaw<
      Array<{ id: string; createdAt: Date; updatedAt: Date }>
    >`
      SELECT chapter.id, chapter.createdAt, chapter.updatedAt
      FROM Chapter AS chapter
      LEFT JOIN BookStructureItem AS structureItem
        ON structureItem.chapterId = chapter.id
      WHERE chapter.workId = ${workId}
        AND chapter.authorId = ${authorId}
        AND chapter.archivedAt IS NULL
        AND structureItem.id IS NULL
      ORDER BY chapter.position ASC
    `;

    let nextPosition = Number(currentMax[0]?.position ?? 0);

    for (const chapter of missingChapters) {
      nextPosition += 1;

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
          ${randomUUID()},
          ${workId},
          ${authorId},
          ${chapter.id},
          'chapter',
          NULL,
          NULL,
          ${nextPosition},
          false,
          ${chapter.createdAt},
          ${chapter.updatedAt}
        )
      `;
    }
  });
}

async function readBookStructure(authorId: string, workId: string) {
  const rows = await prisma.$queryRaw<StructureRow[]>`
    SELECT
      structureItem.id,
      structureItem.chapterId,
      chapter.position AS chapterPosition,
      structureItem.kind,
      CASE
        WHEN structureItem.chapterId IS NULL THEN structureItem.title
        ELSE chapter.title
      END AS title,
      CASE
        WHEN structureItem.chapterId IS NULL THEN structureItem.content
        ELSE chapter.content
      END AS content,
      structureItem.position,
      structureItem.isAutomatic,
      CASE
        WHEN structureItem.chapterId IS NULL THEN structureItem.updatedAt
        ELSE chapter.updatedAt
      END AS updatedAt
    FROM BookStructureItem AS structureItem
    LEFT JOIN Chapter AS chapter
      ON chapter.id = structureItem.chapterId
    WHERE structureItem.workId = ${workId}
      AND structureItem.authorId = ${authorId}
      AND (
        structureItem.chapterId IS NULL
        OR chapter.archivedAt IS NULL
      )
    ORDER BY structureItem.position ASC
  `;

  return rows.map(mapStructureRow);
}

export async function getBookStructure(authorId: string, workId: string) {
  await ensureChapterStructureItems(authorId, workId);
  return readBookStructure(authorId, workId);
}

export async function createSpecialBookSection(
  authorId: string,
  workId: string,
  kind: SpecialBookSectionKind,
) {
  await ensureChapterStructureItems(authorId, workId);

  const itemId = await prisma.$transaction(async (transaction) => {
    const ownedWork = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM Work
      WHERE id = ${workId}
        AND authorId = ${authorId}
      LIMIT 1
      FOR UPDATE
    `;

    if (!ownedWork[0]) {
      throw new Error("Eser bulunamadı veya kitap sayfası ekleme yetkin yok.");
    }

    const duplicate = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM BookStructureItem
      WHERE workId = ${workId}
        AND authorId = ${authorId}
        AND kind = ${kind}
      LIMIT 1
    `;

    if (duplicate[0]) {
      throw new Error(`${bookSectionDetails[kind].label} sayfası zaten kitap yapısında var.`);
    }

    const currentMax = await transaction.$queryRaw<Array<{ position: number | null }>>`
      SELECT MAX(position) AS position
      FROM BookStructureItem
      WHERE workId = ${workId}
        AND authorId = ${authorId}
    `;
    const id = randomUUID();
    const position = Number(currentMax[0]?.position ?? 0) + 1;

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
        ${id},
        ${workId},
        ${authorId},
        NULL,
        ${kind},
        ${bookSectionDetails[kind].defaultTitle},
        '',
        ${position},
        ${kind === "toc"},
        CURRENT_TIMESTAMP(3),
        CURRENT_TIMESTAMP(3)
      )
    `;

    return id;
  });

  const items = await readBookStructure(authorId, workId);
  const item = items.find((candidate) => candidate.id === itemId);

  if (!item) {
    throw new Error("Eklenen kitap sayfası yeniden yüklenemedi.");
  }

  return item;
}

export async function saveSpecialBookSection(
  authorId: string,
  workId: string,
  itemId: string,
  title: string,
  content: string,
) {
  const normalizedTitle = title.trim();

  if (!normalizedTitle || normalizedTitle.length > 200) {
    throw new Error("Sayfa başlığı 1–200 karakter olmalıdır.");
  }

  if (content.length > 500_000) {
    throw new Error("Sayfa metni çok uzun.");
  }

  await prisma.$transaction(async (transaction) => {
    const item = await transaction.$queryRaw<Array<{ id: string; kind: string }>>`
      SELECT structureItem.id, structureItem.kind
      FROM BookStructureItem AS structureItem
      INNER JOIN Work AS work
        ON work.id = structureItem.workId
      WHERE structureItem.id = ${itemId}
        AND structureItem.workId = ${workId}
        AND structureItem.authorId = ${authorId}
        AND structureItem.chapterId IS NULL
        AND work.authorId = ${authorId}
      LIMIT 1
      FOR UPDATE
    `;

    if (!item[0] || item[0].kind === "chapter") {
      throw new Error("Kitap sayfası bulunamadı veya düzenleme yetkin yok.");
    }

    await transaction.$executeRaw`
      UPDATE BookStructureItem
      SET title = ${normalizedTitle},
          content = ${content},
          updatedAt = CURRENT_TIMESTAMP(3)
      WHERE id = ${itemId}
        AND workId = ${workId}
        AND authorId = ${authorId}
    `;
  });

  const items = await readBookStructure(authorId, workId);
  const item = items.find((candidate) => candidate.id === itemId);

  if (!item) {
    throw new Error("Kaydedilen kitap sayfası yeniden yüklenemedi.");
  }

  return item;
}

export async function reorderBookStructure(
  authorId: string,
  workId: string,
  orderedItemIds: string[],
) {
  await ensureChapterStructureItems(authorId, workId);

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
      throw new Error("Eser bulunamadı veya kitap sırasını değiştirme yetkin yok.");
    }

    const existing = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM BookStructureItem
      WHERE workId = ${workId}
        AND authorId = ${authorId}
      ORDER BY position ASC
      FOR UPDATE
    `;
    const existingIds = existing.map((item) => item.id);
    const uniqueOrderedIds = [...new Set(orderedItemIds)];

    if (
      uniqueOrderedIds.length !== existingIds.length ||
      existingIds.some((id) => !uniqueOrderedIds.includes(id))
    ) {
      throw new Error("Kitap sırası güncel değil. Sayfayı yenileyip tekrar dene.");
    }

    for (let index = 0; index < existingIds.length; index += 1) {
      await transaction.$executeRaw`
        UPDATE BookStructureItem
        SET position = ${-(index + 1)}
        WHERE id = ${existingIds[index]}
          AND workId = ${workId}
          AND authorId = ${authorId}
      `;
    }

    for (let index = 0; index < orderedItemIds.length; index += 1) {
      await transaction.$executeRaw`
        UPDATE BookStructureItem
        SET position = ${index + 1},
            updatedAt = CURRENT_TIMESTAMP(3)
        WHERE id = ${orderedItemIds[index]}
          AND workId = ${workId}
          AND authorId = ${authorId}
      `;
    }
  });

  return readBookStructure(authorId, workId);
}

async function ensureAutomaticTableOfContents(authorId: string, workId: string) {
  await ensureChapterStructureItems(authorId, workId);

  return prisma.$transaction(async (transaction) => {
    const ownedWork = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM Work
      WHERE id = ${workId}
        AND authorId = ${authorId}
      LIMIT 1
      FOR UPDATE
    `;

    if (!ownedWork[0]) {
      throw new Error("Eser bulunamadı veya içindekileri hazırlama yetkin yok.");
    }

    const existingItems = await transaction.$queryRaw<
      Array<{ id: string; kind: string; position: number }>
    >`
      SELECT id, kind, position
      FROM BookStructureItem
      WHERE workId = ${workId}
        AND authorId = ${authorId}
      ORDER BY position ASC
      FOR UPDATE
    `;
    const existingToc = existingItems.find((item) => item.kind === "toc");

    if (existingToc) {
      return existingToc.id;
    }

    const frontMatterKinds = new Set([
      "title_page",
      "copyright",
      "dedication",
      "epigraph",
    ]);
    const lastFrontMatterPosition = existingItems.reduce(
      (position, item) =>
        frontMatterKinds.has(item.kind)
          ? Math.max(position, item.position)
          : position,
      0,
    );
    const insertPosition = lastFrontMatterPosition + 1;

    for (const item of [...existingItems]
      .filter((candidate) => candidate.position >= insertPosition)
      .sort((left, right) => right.position - left.position)) {
      await transaction.$executeRaw`
        UPDATE BookStructureItem
        SET position = ${item.position + 1}
        WHERE id = ${item.id}
          AND workId = ${workId}
          AND authorId = ${authorId}
      `;
    }

    const tocId = randomUUID();

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
        ${tocId},
        ${workId},
        ${authorId},
        NULL,
        'toc',
        'İçindekiler',
        '',
        ${insertPosition},
        true,
        CURRENT_TIMESTAMP(3),
        CURRENT_TIMESTAMP(3)
      )
    `;

    return tocId;
  });
}

export async function prepareBookForPublication(
  authorId: string,
  workId: string,
  chapterOverride?: PublicationChapterOverride,
) {
  const tocItemId = await ensureAutomaticTableOfContents(authorId, workId);
  const items = await readBookStructure(authorId, workId);
  const includedKinds = tableOfContentsIncludedKinds as readonly BookSectionKind[];
  const tocLines = items
    .filter(
      (item) =>
        item.id !== tocItemId &&
        includedKinds.includes(item.kind),
    )
    .map((item) =>
      item.chapterId === chapterOverride?.chapterId
        ? chapterOverride.title.trim()
        : item.title.trim(),
    )
    .filter(Boolean);
  const content = tocLines.length
    ? tocLines.join("\n\n")
    : "İçindekiler, eser bölümleri eklendikçe otomatik olarak oluşturulur.";

  await prisma.$executeRaw`
    UPDATE BookStructureItem
    SET title = 'İçindekiler',
        content = ${content},
        isAutomatic = true,
        updatedAt = CURRENT_TIMESTAMP(3)
    WHERE id = ${tocItemId}
      AND workId = ${workId}
      AND authorId = ${authorId}
  `;

  const preparedItems = await readBookStructure(authorId, workId);

  return {
    items: preparedItems.map((item) =>
      item.chapterId === chapterOverride?.chapterId
        ? {
            ...item,
            title: chapterOverride.title,
          }
        : item,
    ),
    tocContent: content,
    tocItemId,
  };
}
