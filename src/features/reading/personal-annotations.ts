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
import {
  PERSONAL_ANNOTATION_TYPES,
  type PersonalAnnotationRecord,
} from "./personal-annotation-types";

type PersonalAnnotationRow = Omit<
  PersonalAnnotationRecord,
  "createdAt" | "updatedAt"
> & {
  createdAt: Date | string;
  updatedAt: Date | string;
};

const pointSchema = z.object({
  x: z.number().finite().min(0).max(1),
  y: z.number().finite().min(0).max(1),
});

const createAnnotationSchema = z.object({
  chapterId: z.string().uuid(),
  endOffset: z.number().int().min(0).max(2_000_000).nullable().optional(),
  note: z.string().trim().min(1).max(1_200).nullable().optional(),
  paragraphIndex: z.number().int().min(0).max(50_000),
  points: z.array(pointSchema).min(2).max(512).nullable().optional(),
  selectedText: z.string().max(8_000).nullable().optional(),
  startOffset: z.number().int().min(0).max(2_000_000).nullable().optional(),
  type: z.enum(PERSONAL_ANNOTATION_TYPES),
});

const updateNoteSchema = z.object({
  id: z.string().uuid(),
  note: z.string().trim().min(1).max(1_200),
});

const annotationIdSchema = z.string().uuid();
const chapterIdSchema = z.string().uuid();

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
  row: PersonalAnnotationRow,
): PersonalAnnotationRecord {
  return {
    ...row,
    anchorVersion: normalizeUnsignedInteger(row.anchorVersion) ?? 1,
    paragraphIndex: normalizeUnsignedInteger(row.paragraphIndex),
    startOffset: normalizeUnsignedInteger(row.startOffset),
    endOffset: normalizeUnsignedInteger(row.endOffset),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

function splitParagraphs(content: string) {
  return content
    .split(/\n{2,}/u)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

async function requireAnnotationUser() {
  const user = await getCurrentUser();

  if (!user || user.status !== "active") {
    throw new Error("ACTIVE_MEMBER_REQUIRED");
  }

  return user;
}

async function getAccessibleChapter(
  user: Awaited<ReturnType<typeof requireAnnotationUser>>,
  chapterId: string,
) {
  const canAccessAdultContent =
    user.role === "admin"
      ? true
      : (await getAdultContentAccess(user.id))
          .canAccessAdultContent;

  return prisma.chapter.findFirst({
    where: {
      archivedAt: null,
      id: chapterId,
      publishedAt: { not: null },
      status: "published",
      work: {
        is: {
          archivedAt: null,
          ...adultContentWorkVisibility(canAccessAdultContent),
          author: {
            is: {
              deletedAt: null,
              status: "active",
            },
          },
          language: "tr",
          publishedAt: { not: null },
          slug: {
            notIn: [...BLOCKED_PUBLIC_WORK_SLUGS],
          },
          status: "published",
          visibility: "public",
        },
      },
    },
    select: {
      content: true,
      id: true,
      workId: true,
    },
  });
}

function validateTextAnchor({
  endOffset,
  paragraph,
  startOffset,
}: {
  endOffset: number | null | undefined;
  paragraph: string;
  startOffset: number | null | undefined;
}) {
  if (
    typeof startOffset !== "number" ||
    typeof endOffset !== "number" ||
    startOffset < 0 ||
    endOffset <= startOffset ||
    endOffset > paragraph.length
  ) {
    return null;
  }

  const selectedText = paragraph.slice(startOffset, endOffset);
  if (!selectedText) return null;

  return {
    endOffset,
    selectedText,
    startOffset,
  };
}

export async function createPersonalAnnotationAction(
  input: unknown,
) {
  const user = await requireAnnotationUser();
  const parsed = createAnnotationSchema.safeParse(input);

  if (!parsed.success) {
    return { annotation: null, status: "invalid" as const };
  }

  const chapter = await getAccessibleChapter(
    user,
    parsed.data.chapterId,
  );

  if (!chapter) {
    return { annotation: null, status: "unavailable" as const };
  }

  const paragraphs = splitParagraphs(chapter.content);
  const paragraph = paragraphs[parsed.data.paragraphIndex];

  if (paragraph === undefined) {
    return { annotation: null, status: "invalid" as const };
  }

  const {
    endOffset,
    note,
    paragraphIndex,
    points,
    startOffset,
    type,
  } = parsed.data;

  const textType =
    type === "highlight" ||
    type === "underline" ||
    type === "note";

  const textAnchor = textType
    ? validateTextAnchor({
        endOffset,
        paragraph,
        startOffset,
      })
    : null;

  if (textType && !textAnchor) {
    return { annotation: null, status: "invalid" as const };
  }

  if (type === "note" && !note) {
    return { annotation: null, status: "invalid" as const };
  }

  if (type === "drawing" && !points) {
    return { annotation: null, status: "invalid" as const };
  }

  const id = randomUUID();
  const normalizedPathData =
    type === "drawing" && points
      ? JSON.stringify(points)
      : null;
  const normalizedStartOffset = textAnchor?.startOffset ?? null;
  const normalizedEndOffset = textAnchor?.endOffset ?? null;
  const normalizedSelectedText = textAnchor?.selectedText ?? null;
  const normalizedNote = type === "note" ? note ?? null : null;

  const insert = prisma.$executeRaw`
    INSERT INTO PersonalAnnotation (
      id,
      userId,
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
    ) VALUES (
      ${id},
      ${user.id},
      ${chapter.workId},
      ${chapter.id},
      ${type},
      ${paragraphIndex},
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
        DELETE FROM PersonalAnnotation
        WHERE userId = ${user.id}
          AND workId = ${chapter.workId}
          AND type = 'reading_position'
      `,
      insert,
    ]);
  } else {
    await insert;
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
    WHERE id = ${id}
      AND userId = ${user.id}
    LIMIT 1
  `;

  return {
    annotation: rows[0] ? mapAnnotationRow(rows[0]) : null,
    status: rows[0] ? ("saved" as const) : ("unavailable" as const),
  };
}

export async function updatePersonalAnnotationNoteAction(
  input: unknown,
) {
  const user = await requireAnnotationUser();
  const parsed = updateNoteSchema.safeParse(input);

  if (!parsed.success) {
    return { status: "invalid" as const };
  }

  const updated = await prisma.$executeRaw`
    UPDATE PersonalAnnotation
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

export async function deletePersonalAnnotationAction(
  input: unknown,
) {
  const user = await requireAnnotationUser();
  const parsed = annotationIdSchema.safeParse(input);

  if (!parsed.success) {
    return { status: "invalid" as const };
  }

  const deleted = await prisma.$executeRaw`
    DELETE FROM PersonalAnnotation
    WHERE id = ${parsed.data}
      AND userId = ${user.id}
  `;

  return {
    status: deleted > 0 ? ("deleted" as const) : ("unavailable" as const),
  };
}

export async function clearPersonalAnnotationsAction(
  input: unknown,
) {
  const user = await requireAnnotationUser();
  const parsed = chapterIdSchema.safeParse(input);

  if (!parsed.success) {
    return { status: "invalid" as const };
  }

  await prisma.$executeRaw`
    DELETE FROM PersonalAnnotation
    WHERE chapterId = ${parsed.data}
      AND userId = ${user.id}
  `;

  return { status: "cleared" as const };
}