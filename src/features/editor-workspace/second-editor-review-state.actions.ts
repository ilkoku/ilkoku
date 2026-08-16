"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/current-user";
import { sendAuthorEditorStatusEmail } from "@/lib/email/editor-emails";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { EditorActionState } from "./types";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function secondReviewValues(formData: FormData) {
  const title = value(formData, "title");
  const content = value(formData, "content");
  const category = value(formData, "category") || "genel";
  const priority =
    formData.get("priority") === "important"
      ? ("important" as const)
      : ("normal" as const);

  if (title.length < 3 || title.length > 160) {
    throw new Error("INVALID_REVIEW_TITLE");
  }

  if (content.length < 20 || content.length > 10000) {
    throw new Error("INVALID_REVIEW_CONTENT");
  }

  if (category.length < 2 || category.length > 60) {
    throw new Error("INVALID_REVIEW_CATEGORY");
  }

  return {
    category,
    content,
    priority,
    title,
  };
}

async function requireEditorSession() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("EDITOR_PERMISSION_REQUIRED");
  }

  return user;
}

type LockRow = {
  id: string;
};

async function lockLiveSecondReviewContext(
  transaction: Prisma.TransactionClient,
  editorId: string,
  workId: string,
) {
  const lockedEditor = await transaction.$queryRaw<LockRow[]>`
    SELECT id
    FROM User
    WHERE id = ${editorId}
    LIMIT 1
    FOR UPDATE
  `;

  if (!lockedEditor[0]) {
    throw new Error("EDITOR_PERMISSION_REQUIRED");
  }

  const editor = await transaction.user.findUnique({
    where: { id: editorId },
    select: {
      deletedAt: true,
      role: true,
      status: true,
    },
  });

  if (
    !editor ||
    editor.deletedAt !== null ||
    editor.role !== "editor" ||
    editor.status !== "active"
  ) {
    throw new Error("EDITOR_PERMISSION_REQUIRED");
  }

  const lockedAssignments = await transaction.$queryRaw<LockRow[]>`
    SELECT id
    FROM EditorReviewAssignment
    WHERE workId = ${workId}
      AND stage = 'second'
    LIMIT 1
    FOR UPDATE
  `;

  const assignmentId = lockedAssignments[0]?.id;
  if (!assignmentId) {
    throw new Error("SECOND_REVIEW_ASSIGNMENT_NOT_FOUND");
  }

  const lockedWorks = await transaction.$queryRaw<LockRow[]>`
    SELECT id
    FROM Work
    WHERE id = ${workId}
    LIMIT 1
    FOR UPDATE
  `;

  if (!lockedWorks[0]) {
    throw new Error("SECOND_REVIEW_WORK_NOT_FOUND");
  }

  const assignment = await transaction.editorReviewAssignment.findUnique({
    where: { id: assignmentId },
    select: {
      editorId: true,
      id: true,
      startedAt: true,
      status: true,
      work: {
        select: {
          assignedEditorId: true,
          author: {
            select: {
              email: true,
              fullName: true,
            },
          },
          authorId: true,
          editorReviewAssignments: {
            where: { stage: "first" },
            select: { status: true },
            take: 1,
          },
          editorReviewStatus: true,
          id: true,
          slug: true,
          title: true,
        },
      },
    },
  });

  const firstAssignment = assignment?.work.editorReviewAssignments[0] ?? null;
  const valid =
    Boolean(assignment) &&
    assignment?.editorId === editorId &&
    (assignment.status === "assigned" || assignment.status === "in_progress") &&
    assignment.work.id === workId &&
    assignment.work.authorId !== editorId &&
    assignment.work.assignedEditorId !== editorId &&
    assignment.work.editorReviewStatus === "second_in_progress" &&
    firstAssignment?.status === "completed";

  if (!valid || !assignment) {
    throw new Error("SECOND_REVIEW_STATE_CHANGED");
  }

  return assignment;
}

async function upsertSecondReviewFeedback(
  transaction: Prisma.TransactionClient,
  input: {
    assignmentId: string;
    authorId: string;
    editorId: string;
    reportStatus: "completed" | "draft";
    values: ReturnType<typeof secondReviewValues>;
    workId: string;
  },
) {
  const existing = await transaction.editorFeedback.findFirst({
    where: {
      editorId: input.editorId,
      isProfessionalReview: true,
      workId: input.workId,
      OR: [
        { assignmentId: input.assignmentId },
        { assignmentId: null },
      ],
    },
    select: {
      id: true,
      reportStatus: true,
    },
  });

  if (
    input.reportStatus === "draft" &&
    existing?.reportStatus === "completed"
  ) {
    throw new Error("SECOND_REVIEW_ALREADY_COMPLETED");
  }

  if (existing) {
    await transaction.editorFeedback.update({
      where: { id: existing.id },
      data: {
        ...input.values,
        assignmentId: input.assignmentId,
        reportStatus: input.reportStatus,
      },
    });
    return;
  }

  await transaction.editorFeedback.create({
    data: {
      ...input.values,
      assignmentId: input.assignmentId,
      authorId: input.authorId,
      editorId: input.editorId,
      isProfessionalReview: true,
      reportStatus: input.reportStatus,
      workId: input.workId,
    },
  });
}

function refreshSecondReview(workSlug: string) {
  revalidatePath("/editor/incelemeler");
  revalidatePath("/editor/bildirimler");
  revalidatePath("/yazar");
  revalidatePath("/eserlerim");
  revalidatePath("/geri-bildirimler");
  revalidatePath(`/kitap/${workSlug}`);
  revalidatePath(`/oku/${workSlug}`);
}

export async function saveSecondEditorReviewDraftAction(
  _state: EditorActionState,
  formData: FormData,
): Promise<EditorActionState> {
  try {
    const sessionEditor = await requireEditorSession();
    const workId = value(formData, "workId");
    const values = secondReviewValues(formData);

    if (!workId) {
      return {
        status: "error",
        message: "Eser bilgisi bulunamadı.",
      };
    }

    const now = new Date();

    const result = await prisma.$transaction(async (transaction) => {
      const assignment = await lockLiveSecondReviewContext(
        transaction,
        sessionEditor.id,
        workId,
      );

      if (assignment.status === "assigned") {
        await transaction.editorReviewAssignment.update({
          where: { id: assignment.id },
          data: {
            startedAt: assignment.startedAt ?? now,
            status: "in_progress",
          },
        });
      }

      await upsertSecondReviewFeedback(transaction, {
        assignmentId: assignment.id,
        authorId: assignment.work.authorId,
        editorId: sessionEditor.id,
        reportStatus: "draft",
        values,
        workId: assignment.work.id,
      });

      return {
        slug: assignment.work.slug,
      };
    });

    refreshSecondReview(result.slug);

    return {
      status: "success",
      message: "İkinci editör inceleme taslağı kaydedildi.",
    };
  } catch (error) {
    console.error("SECOND_EDITOR_DRAFT_SAVE_FAILED", {
      error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
    });

    return {
      status: "error",
      message: "İkinci editör inceleme taslağı kaydedilemedi.",
    };
  }
}

export async function completeSecondEditorReviewAction(
  _state: EditorActionState,
  formData: FormData,
): Promise<EditorActionState> {
  try {
    const sessionEditor = await requireEditorSession();
    const workId = value(formData, "workId");
    const values = secondReviewValues(formData);
    const completedAt = new Date();

    if (!workId) {
      return {
        status: "error",
        message: "Eser bilgisi bulunamadı.",
      };
    }

    const result = await prisma.$transaction(async (transaction) => {
      const assignment = await lockLiveSecondReviewContext(
        transaction,
        sessionEditor.id,
        workId,
      );

      await transaction.editorReviewAssignment.update({
        where: { id: assignment.id },
        data: {
          completedAt,
          startedAt: assignment.startedAt ?? completedAt,
          status: "completed",
        },
      });

      await upsertSecondReviewFeedback(transaction, {
        assignmentId: assignment.id,
        authorId: assignment.work.authorId,
        editorId: sessionEditor.id,
        reportStatus: "completed",
        values,
        workId: assignment.work.id,
      });

      const completedWork = await transaction.work.updateMany({
        where: {
          id: assignment.work.id,
          editorReviewStatus: "second_in_progress",
        },
        data: {
          editorReviewCompletedAt: completedAt,
          editorReviewStatus: "completed",
        },
      });

      if (completedWork.count !== 1) {
        throw new Error("FINAL_REVIEW_STATE_CHANGED");
      }

      await transaction.notification.create({
        data: {
          message: `${assignment.work.title} adlı eserinizin iki aşamalı profesyonel editör incelemesi tamamlandı.`,
          relatedEntityId: assignment.work.id,
          relatedEntityType: "work",
          title: "Profesyonel inceleme tamamlandı",
          type: "editor_review",
          userId: assignment.work.authorId,
        },
      });

      return {
        authorEmail: assignment.work.author.email,
        authorName: assignment.work.author.fullName,
        slug: assignment.work.slug,
        title: assignment.work.title,
        workId: assignment.work.id,
      };
    });

    try {
      await sendAuthorEditorStatusEmail({
        email: result.authorEmail,
        fullName: result.authorName,
        stage: "completed",
        workId: result.workId,
        workTitle: result.title,
      });
    } catch (emailError) {
      console.error("EDITOR_EMAIL_DELIVERY_FAILED", {
        event: "second_review_completed",
        workId: result.workId,
        error:
          emailError instanceof Error ? emailError.message : "UNKNOWN_ERROR",
      });
    }

    refreshSecondReview(result.slug);

    return {
      status: "success",
      message: "İkinci editör incelemesi tamamlandı. Nihai rapor yazara iletildi.",
    };
  } catch (error) {
    console.error("SECOND_EDITOR_REVIEW_COMPLETE_FAILED", {
      error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
    });

    return {
      status: "error",
      message: "İkinci editör incelemesi tamamlanamadı.",
    };
  }
}
