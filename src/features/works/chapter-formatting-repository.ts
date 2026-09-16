import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type StoredChapterFormatting = {
  chapterId: string;
  formatting: string;
};

export async function getChapterFormatting(chapterId: string) {
  const rows = await prisma.$queryRaw<StoredChapterFormatting[]>(Prisma.sql`
    SELECT chapterId, formatting
    FROM ChapterFormatting
    WHERE chapterId = ${chapterId}
    LIMIT 1
  `);
  return rows[0]?.formatting ?? "";
}

export async function getChapterFormattingMap(chapterIds: string[]) {
  if (chapterIds.length === 0) return new Map<string, string>();

  const rows = await prisma.$queryRaw<StoredChapterFormatting[]>(Prisma.sql`
    SELECT chapterId, formatting
    FROM ChapterFormatting
    WHERE chapterId IN (${Prisma.join(chapterIds)})
  `);

  return new Map(rows.map((row) => [row.chapterId, row.formatting] as const));
}

export async function saveChapterFormatting(
  chapterId: string,
  formatting: string,
) {
  if (!formatting) {
    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM ChapterFormatting
      WHERE chapterId = ${chapterId}
    `);
    return;
  }

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO ChapterFormatting (chapterId, formatting)
    VALUES (${chapterId}, ${formatting})
    ON DUPLICATE KEY UPDATE
      formatting = VALUES(formatting),
      updatedAt = CURRENT_TIMESTAMP(3)
  `);
}
