"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";

import {
  adultContentWorkVisibility,
  getAdultContentAccess,
} from "@/lib/adult-content-access";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { BLOCKED_PUBLIC_WORK_SLUGS } from "@/lib/public-content-safety";
import { getLatestPublishedBookSnapshot } from "@/features/works/publication-snapshots";
import {
  PERSONAL_BOOK_ANNOTATION_TYPES,
  type PersonalBookAnnotationRecord,
} from "./personal-book-annotation-types";
import {
  serializePersonalPagePointAnchor,
  type PersonalPagePointAnchor,
} from "./personal-page-point-anchor";

type PersonalBookAnnotationRow = Omit<
  PersonalBookAnnotationRecord,
  "createdAt" | "updatedAt"
> & {
  createdAt: Date | string;
  updatedAt: Date | string;
};

const pointSchema = z.object({
  x: z.number().finite().min(0).max(1),
  y: z.number().finite().min(0).max(1),
});

const pagePointSchema = pointSchema.extend({
  pageIndex: z.number().int().min(0).max(50_000),
});

const createAnnotationSchema = z.object({
  endOffset: z.number().int().min(0).max(2_000_000).nullable().optional(),
  note: z.string().trim().min(1).max(1_200).nullable().optional(),
  pagePoint: pagePointSchema.nullable().optional(),
  publicationItemId: z.string().uuid(),
  selectedText: z.string().max(8_000).nullable().optional(),
  startOffset: z.number().int().min(0).max(2_000_000).nullable().optional(),
  type: z.enum(PERSONAL_BOOK_ANNOTATION_TYPES),
  workId: z.string().uuid(),
});

const updateNoteSchema = z.object({
  id: z.string().uuid(),
  note: z.string().trim().min(1).max(1_200),
});

const annotationIdSchema = z.string().uuid();
const clearSchema = z.object({
  publicationItemId: z.string().uuid(),
  workId: z.string().uuid(),
});

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

function mapAnnotationRow(
  row: PersonalBookAnnotationRow,
): PersonalBookAnnotationRecord {
  return {
    ...row,
    anchorVersion: normalizeUnsignedInteger(row.anchorVersion) ?? 1,
    startOffset: normalizeUnsignedInteger(row.startOffset),
    endOffset: normalizeUnsignedInteger(row.endOffset),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

async function requireAnnotationUser() {
  const user = await getCurrentUser();
  if (!user || user.status !== "active") {
    throw new Error("ACTIVE_MEMBER_REQUIRED");
  }
  return user;
}

async function getAccessiblePublicationItem(
  user: Awaited<ReturnType<typeof requireAnnotationUser>>,
  workId: string,
  publicationItemId: string,
) {
  const canAccessAdultContent =
    user.role === "admin"
      ? true
      : (await getAdultContentAccess(user.id)).canAccessAdultContent;

  const work = await prisma.work.findFirst({
    where: {
      archivedAt: null,
      id: workId,
      ...adultContentWorkVisibility(canAccessAdultContent),
      author: {
        is: {
          deletedAt: null,
          status: "active",
        },
      },
      language: "tr",
      publishedAt: { not: null },
      slug: { notIn: [...BLOCKED_PUBLIC_WORK_SLUGS] },
      status: "published",
      visibility: "public",
    },
    select: { id: true },
  });

  if (!work) return null;

  const publication = await getLatestPublishedBookSnapshot(workId);
  const item = publication?.items.find(
    (candidate) => candidate.structureItemId === publicationItemId,
  );

  return item ?? null;
}

function validateTextAnchor({
  content,
  endOffset,
  startOffset,
}: {
  content: string;
  endOffset: number | null | undefined;
  startOffset: number | null | undefined;
}) {
  if (
    typeof startOffset !== "number" ||
    typeof endOffset !== "number" ||
    startOffset < 0 ||
    endOffset <= startOffset ||
    endOffset > content.length
  ) {
    return null;
  }

  const selectedText = content.slice(startOffset, endOffset);
  if (!selectedText || selectedText.length > 8_000) return null;

  return { endOffset, selectedText, startOffset };
}

export async function createPersonalBookAnnotationAction(input: unknown) {
  const user = await requireAnnotationUser();
  const parsed = createAnnotationSchema.safeParse(input);
  if (!parsed.success) {
    return { annotation: null, status: "invalid" as const };
  }

  const item = await getAccessiblePublicationItem(
    user,
    parsed.data.workId,
    parsed.data.publicationItemId,
  );
  if (!item) {
    return { annotation: null, status: "unavailable" as const };
  }

  const { endOffset, note, pagePoint, startOffset, type } = parsed.data;
  const textType =
    type === "highlight" || type === "underline" || type === "note";
  const pointType = type === "pin" || type === "reading_position";
  const textAnchor = textType
    ? validateTextAnchor({
        content: item.content,
        endOffset,
        startOffset,
      })
    : null;

  if (textType && !textAnchor) {
    return { annotation: null, status: "invalid" as const };
  }
  if (type === "note" && !note) {
    return { annotation: null, status: "invalid" as const };
  }
  if (pointType && !pagePoint) {
    return { annotation: null, status: "invalid" as const };
  }
  if (pagePoint && pagePoint.pageIndex >= item.layout.pageEnds.length) {
    return { annotation: null, status: "invalid" as const };
  }

  const id = randomUUID();
  const normalizedPathData =
    pointType && pagePoint
      ? serializePersonalPagePointAnchor(pagePoint as PersonalPagePointAnchor)
      : null;
  const normalizedStartOffset = textAnchor?.startOffset ?? null;
  const normalizedEndOffset = textAnchor?.endOffset ?? null;
  const normalizedSelectedText = textAnchor?.selectedText ?? null;
  const normalizedNote = type === "note" ? note ?? null : null;

  const insert = prisma.$executeRaw`
    INSERT INTO PersonalBookAnnotation (
      id,
      userId,
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
    ) VALUES (
      ${id},
      ${user.id},
      ${parsed.data.workId},
      ${parsed.data.publicationItemId},
      ${type},
      ${normalizedStartOffset},
      ${normalizedEndOffset},
      ${normalizedSelectedText},
      ${normalizedNote},
      ${normalizedPathData},
      1,
      NOW(3),
      NOW(3)
    )
  `;

  if (type === "reading_position") {
    await prisma.$transaction([
      prisma.$executeRaw`
        DELETE FROM PersonalBookAnnotation
        WHERE userId = ${user.id}
          AND workId = ${parsed.data.workId}
          AND type = 'reading_position'
      `,
      insert,
    ]);
  } else {
    await insert;
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
    WHERE id = ${id}
      AND userId = ${user.id}
    LIMIT 1
  `;

  return {
    annotation: rows[0] ? mapAnnotationRow(rows[0]) : null,
    status: rows[0] ? ("saved" as const) : ("unavailable" as const),
  };
}

export async function updatePersonalBookAnnotationNoteAction(input: unknown) {
  const user = await requireAnnotationUser();
  const parsed = updateNoteSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" as const };

  const updated = await prisma.$executeRaw`
    UPDATE PersonalBookAnnotation
    SET note = ${parsed.data.note}, updatedAt = NOW(3)
    WHERE id = ${parsed.data.id}
      AND userId = ${user.id}
      AND type = 'note'
  `;

  return {
    note: parsed.data.note,
    status: updated > 0 ? ("saved" as const) : ("unavailable" as const),
  };
}

export async function deletePersonalBookAnnotationAction(input: unknown) {
  const user = await requireAnnotationUser();
  const parsed = annotationIdSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" as const };

  const deleted = await prisma.$executeRaw`
    DELETE FROM PersonalBookAnnotation
    WHERE id = ${parsed.data}
      AND userId = ${user.id}
  `;

  return {
    status: deleted > 0 ? ("deleted" as const) : ("unavailable" as const),
  };
}

export async function clearPersonalBookAnnotationsAction(input: unknown) {
  const user = await requireAnnotationUser();
  const parsed = clearSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" as const };

  await prisma.$executeRaw`
    DELETE FROM PersonalBookAnnotation
    WHERE userId = ${user.id}
      AND workId = ${parsed.data.workId}
      AND publicationItemId = ${parsed.data.publicationItemId}
  `;

  return { status: "cleared" as const };
}
