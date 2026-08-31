import "server-only";

import { z } from "zod";

import { prisma } from "@/lib/prisma";
import type { PersonalAnnotationRecord } from "./personal-annotation-types";

type PersonalAnnotationRow = Omit<
  PersonalAnnotationRecord,
  "createdAt" | "updatedAt"
> & {
  createdAt: Date | string;
  updatedAt: Date | string;
};

const idSchema = z.string().uuid();

function toIso(value: Date | string) {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

function normalizeUnsignedInteger(value: unknown) {
  if (value === null || value === undefined) return null;
  const normalized = Number(value);
  return Number.isSafeInteger(normalized) && normalized >= 0
    ? normalized
    : null;
}

export async function getPersonalAnnotations(
  userId: string,
  chapterId: string,
): Promise<PersonalAnnotationRecord[]> {
  const validUserId = idSchema.safeParse(userId);
  const validChapterId = idSchema.safeParse(chapterId);

  if (!validUserId.success || !validChapterId.success) {
    return [];
  }

  const rows = await prisma.$queryRaw<PersonalAnnotationRow[]>`
    SELECT
      id,
      workId,
      chapterId,
      type,
      paragraphIndex,
      startOffset,
      endOffset,
      selectedText,
      note,
      pathData,
      anchorVersion,
      createdAt,
      updatedAt
    FROM PersonalAnnotation
    WHERE userId = ${validUserId.data}
      AND chapterId = ${validChapterId.data}
    ORDER BY createdAt ASC, id ASC
  `;

  return rows.map((row) => ({
    ...row,
    anchorVersion: normalizeUnsignedInteger(row.anchorVersion) ?? 1,
    paragraphIndex: normalizeUnsignedInteger(row.paragraphIndex),
    startOffset: normalizeUnsignedInteger(row.startOffset),
    endOffset: normalizeUnsignedInteger(row.endOffset),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  }));
}