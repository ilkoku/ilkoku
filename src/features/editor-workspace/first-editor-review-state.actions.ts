"use server";

import { revalidatePath } from "next/cache";

import type { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth/current-user";
import { sendAuthorEditorStatusEmail } from "@/lib/email/editor-emails";
import { prisma } from "@/lib/prisma";
import type { EditorActionState } from "./types";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function reviewValues(formData: FormData) {
  const title = text(formData, "title");
  const content = text(formData, "content");
  const category = text(formData, "category") || "genel";
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

async function lockLiveFirstReviewContext(
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
      AND stage = 'first'
    LIMIT 1
    FOR UPDATE
  `;

  const assignmentId = lockedAssignments[0]?.id;
  if (!assignmentId) {
    throw new Error("FIRST_REVIEW_ASSIGNMENT_NOT_FOUND");
  }

  const lockedWorks = await transaction.$queryRaw<LockRow[]>`
    SELECT id
    FROM Work
    WHERE id = ${workId}
    LIMIT 1
    FOR UPDATE
  `;

  if (!lockedWorks[0]) {
    throw new Error("FIRST_REVIEW_WORK_NOT_FOUND");
  }

  const assignment = await transaction.editorReviewAssignment.findUnique({
    where: { id: assignmentId },
    select: {
      editorId: true,
      id: true,
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
          editorReviewStatus: true,
          id: true,
          slug: true,
          title: true,
        },
      },
    },
  });

  const valid =
    Boolean(assignment) &&
    assignment?.editorId === editorId &&
    assignment.status === "in_progress" &&
    assignment.work.id === workId &&
    assignment.work.authorId !== editorId &&
    assignment.work.assignedEditorId === editorId &&
    assignment.work.editorReviewStatus === "in_progress";

  if (!valid || !assignment) {
    throw new Error("FIRST_REVIEW_STATE_CHANGED");
  }

  return assignment;
}

async function upsertFirstReviewFeedback(
  transaction: Prisma.TransactionClient,
  input: {
    assignmentId: string;
    authorId: string;
    editorId: string;
    reportStatus: "completed" | "draft";
    values: ReturnType<typeof reviewValues>;
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
    throw new Error("FIRST_REVIEW_ALREADY_COMPLETED");
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

function refreshFirstReview(workSlug: string) {
  revalidatePath("/editor/kesfet");
  revalidatePath("/editor/talepler");
  revalidatePath("/editor/incelemeler");
  revalidatePath("/editor/onerilenler");
  revalidatePath("/editor/bildirimler");
  revalidatePath("/yazar");
  revalidatePath("/eserlerim");
  revalidatePath("/geri-bildirimler");
  revalidatePath(`/kitap/${workSlug}`);
  revalidatePath(`/oku/${workSlug}`);
}

export async function saveFirstEditorReviewDraftAction(
  _state: EditorActionState,
  formData: FormData,
): Promise<EditorActionState> {
  try {
    const sessionEditor = await requireEditorSession();
    const workId = text(formData, "workId");
    const values = reviewValues(formData);

    if (!workId) {
      return {
        message: "Eser bilgisi bulunamadı.",
        status: "error",
      };
    }

    const result = await prisma.$transaction(async (transaction) => {
      const assignment = await lockLiveFirstReviewContext(
        transaction,
        sessionEditor.id,
        workId,
      );

      await upsertFirstReviewFeedback(transaction, {
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

    refreshFirstReview(result.slug);

    return {
      message: "Birinci editör inceleme taslağı kaydedildi.",
      status: "success",
    };
  } catch (error) {
    console.error("FIRST_EDITOR_DRAFT_SAVE_FAILED", {
      error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
    });

    return {
      message: "Birinci editör inceleme taslağı kaydedilemedi.",
      status: "error",
    };
  }
}

export async function completeFirstEditorReviewStateAction(
  _state: EditorActionState,
  formData: FormData,
): Promise<EditorActionState> {
  try {
    const sessionEditor = await requireEditorSession();
    const workId = text(formData, "workId");
    const intent = text(formData, "intent");
    const values = reviewValues(formData);

    if (intent !== "complete" && intent !== "second") {
      return {
        message: "Geçerli bir inceleme sonucu seçin.",
        status: "error",
      };
    }

    if (!workId) {
      return {
        message: "Eser bilgisi bulunamadı.",
        status: "error",
      };
    }

    const completedAt = new Date();

    const result = await prisma.$transaction(async (transaction) => {
      const assignment = await lockLiveFirstReviewContext(
        transaction,
        sessionEditor.id,
        workId,
      );

      await transaction.editorReviewAssignment.update({
        where: { id: assignment.id },
        data: {
          completedAt,
          status: "completed",
        },
      });

      await upsertFirstReviewFeedback(transaction, {
        assignmentId: assignment.id,
        authorId: assignment.work.authorId,
        editorId: sessionEditor.id,
        reportStatus: "completed",
        values,
        workId: assignment.work.id,
      });

      const updatedWork = await transaction.work.updateMany({
        where: {
          assignedEditorId: sessionEditor.id,
          editorReviewStatus: "in_progress",
          id: assignment.work.id,
        },
        data:
          intent === "complete"
            ? {
                editorReviewCompletedAt: completedAt,
                editorReviewStatus: "completed",
              }
            : {
                editorReviewCompletedAt: null,
                editorReviewStatus: "awaiting_second_editor",
              },
      });

      if (updatedWork.count !== 1) {
        throw new Error("FIRST_REVIEW_WORK_STATE_CHANGED");
      }

      if (intent === "complete") {
        await transaction.notification.create({
          data: {
            message: `${assignment.work.title} adlı eserinizin profesyonel editör incelemesi tamamlandı.`,
            relatedEntityId: assignment.work.id,
            relatedEntityType: "work",
            title: "Profesyonel inceleme tamamlandı",
            type: "editor_review",
            userId: assignment.work.authorId,
          },
        });
      }

      return {
        authorEmail: assignment.work.author.email,
        authorName: assignment.work.author.fullName,
        intent,
        slug: assignment.work.slug,
        title: assignment.work.title,
        workId: assignment.work.id,
      };
    });

    try {
      await sendAuthorEditorStatusEmail({
        email: result.authorEmail,
        fullName: result.authorName,
        stage:
          result.intent === "complete"
            ? "completed"
            : "first_completed",
        workId: result.workId,
        workTitle: result.title,
      });
    } catch (emailError) {
      console.error("EDITOR_EMAIL_DELIVERY_FAILED", {
        event:
          result.intent === "complete"
            ? "first_review_completed"
            : "first_review_ready_for_second",
        workId: result.workId,
        error:
          emailError instanceof Error ? emailError.message : "UNKNOWN_ERROR",
      });
    }

    refreshFirstReview(result.slug);

    return {
      message:
        result.intent === "complete"
          ? "Profesyonel inceleme tamamlandı ve yazara iletildi."
          : "Birinci editör incelemesi tamamlandı. Eser ikinci editör aşamasına hazır.",
      status: "success",
    };
  } catch (error) {
    console.error("FIRST_EDITOR_REVIEW_COMPLETE_FAILED", {
      error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
    });

    return {
      message: "Profesyonel inceleme tamamlanamadı.",
      status: "error",
    };
  }
}
