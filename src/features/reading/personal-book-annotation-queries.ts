import "server-only";

import { z } from "zod";

import { prisma } from "@/lib/prisma";
import type { PersonalBookAnnotationRecord } from "./personal-book-annotation-types";

type PersonalBookAnnotationRow = Omit<
  PersonalBookAnnotationRecord,
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

export async function getPersonalBookAnnotations(
  userId: string,
  workId: string,
  publicationItemId: string,
): Promise<PersonalBookAnnotationRecord[]> {
  const validUserId = idSchema.safeParse(userId);
  const validWorkId = idSchema.safeParse(workId);
  const validPublicationItemId = idSchema.safeParse(publicationItemId);

  if (
    !validUserId.success ||
    !validWorkId.success ||
    !validPublicationItemId.success
  ) {
    return [];
  }

  const rows = await prisma.$queryRaw<PersonalBookAnnotationRow[]>`
    SELECT
      id,
      workId,
      publicationItemId,
      type,
      startOffset,
      endOffset,
      selectedText,
      note,
      pathData,
      anchorVersion,
      createdAt,
      updatedAt
    FROM PersonalBookAnnotation
    WHERE userId = ${validUserId.data}
      AND workId = ${validWorkId.data}
      AND publicationItemId = ${validPublicationItemId.data}
    ORDER BY createdAt ASC, id ASC
  `;

  return rows.map((row) => ({
    ...row,
    anchorVersion: normalizeUnsignedInteger(row.anchorVersion) ?? 1,
    startOffset: normalizeUnsignedInteger(row.startOffset),
    endOffset: normalizeUnsignedInteger(row.endOffset),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  }));
}
