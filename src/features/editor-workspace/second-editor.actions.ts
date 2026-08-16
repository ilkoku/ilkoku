"use server";

import type { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth/current-user";
import { sendSecondEditorAssignmentEmail } from "@/lib/email/editor-emails";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { EditorActionState } from "./types";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

async function requireEditorSession() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("EDITOR_PERMISSION_REQUIRED");
  }

  return user;
}

async function lockLiveEditor(
  transaction: Prisma.TransactionClient,
  editorId: string,
) {
  const locked = await transaction.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM User
    WHERE id = ${editorId}
    LIMIT 1
    FOR UPDATE
  `;

  if (!locked[0]) {
    throw new Error("EDITOR_PERMISSION_REQUIRED");
  }

  const editor = await transaction.user.findUnique({
    where: { id: editorId },
    select: {
      deletedAt: true,
      email: true,
      fullName: true,
      id: true,
      role: true,
      status: true,
    },
  });

  if (
    !editor ||
    editor.role !== "editor" ||
    editor.status !== "active" ||
    editor.deletedAt !== null
  ) {
    throw new Error("EDITOR_PERMISSION_REQUIRED");
  }

  return editor;
}

async function lockSecondReviewWorkState(
  transaction: Prisma.TransactionClient,
  workId: string,
) {
  const lockedWork = await transaction.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM Work
    WHERE id = ${workId}
    LIMIT 1
    FOR UPDATE
  `;

  if (!lockedWork[0]) {
    throw new Error("SECOND_REVIEW_WORK_STATE_CHANGED");
  }

  await transaction.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM EditorReviewAssignment
    WHERE workId = ${workId}
    ORDER BY stage, id
    FOR UPDATE
  `;
}

function refreshEditorFlow(workSlug?: string) {
  revalidatePath("/editor/incelemeler");
  revalidatePath("/editor/kesfet");
  revalidatePath("/editor/onerilenler");
  revalidatePath("/editor/bildirimler");
  revalidatePath("/yazar");
  revalidatePath("/eserlerim");

  if (workSlug) {
    revalidatePath(`/kitap/${workSlug}`);
    revalidatePath(`/oku/${workSlug}`);
  }
}

/**
 * Birinci editör incelemesi tamamlandıktan sonra ikinci editör görevini açar.
 * Bu modül yalnız assignment açma/claim davranışını taşır. Draft ve completion
 * write'ları canonical second-editor-review-state.actions.ts içindedir.
 */
export async function sendToSecondEditorAction(
  _state: EditorActionState,
  formData: FormData,
): Promise<EditorActionState> {
  try {
    const sessionSender = await requireEditorSession();
    const workId = value(formData, "workId");
    const mode = value(formData, "mode");
    const editorId = value(formData, "editorId");

    if (!workId || !["pool", "specific"].includes(mode)) {
      return {
        status: "error",
        message: "İkinci editör seçimi geçersiz.",
      };
    }

    const result = await prisma.$transaction(async (transaction) => {
      const sender = await lockLiveEditor(transaction, sessionSender.id);
      await lockSecondReviewWorkState(transaction, workId);

      const work = await transaction.work.findUnique({
        where: { id: workId },
        select: {
          assignedEditorId: true,
          authorId: true,
          editorReviewStatus: true,
          id: true,
          slug: true,
          title: true,
        },
      });
      const firstAssignment = await transaction.editorReviewAssignment.findUnique({
        where: {
          workId_stage: {
            workId,
            stage: "first",
          },
        },
        select: {
          editorId: true,
          status: true,
        },
      });
      const existingAssignment = await transaction.editorReviewAssignment.findUnique({
        where: {
          workId_stage: {
            workId,
            stage: "second",
          },
        },
        select: {
          editorId: true,
          id: true,
          source: true,
          status: true,
        },
      });

      if (
        !work ||
        work.assignedEditorId !== sender.id ||
        work.editorReviewStatus !== "awaiting_second_editor" ||
        firstAssignment?.editorId !== sender.id ||
        firstAssignment.status !== "completed"
      ) {
        throw new Error("SECOND_REVIEW_WORK_STATE_CHANGED");
      }

      let targetEditor: {
        email: string;
        fullName: string;
        id: string;
      } | null = null;

      if (mode === "specific") {
        if (!editorId || editorId === sender.id || editorId === work.authorId) {
          throw new Error("SECOND_REVIEW_TARGET_INVALID");
        }

        const lockedTarget = await transaction.$queryRaw<Array<{ id: string }>>`
          SELECT id
          FROM User
          WHERE id = ${editorId}
          LIMIT 1
          FOR UPDATE
        `;
        if (!lockedTarget[0]) {
          throw new Error("SECOND_REVIEW_TARGET_INVALID");
        }

        const target = await transaction.user.findUnique({
          where: { id: editorId },
          select: {
            deletedAt: true,
            email: true,
            fullName: true,
            id: true,
            role: true,
            status: true,
          },
        });

        if (
          !target ||
          target.role !== "editor" ||
          target.status !== "active" ||
          target.deletedAt !== null
        ) {
          throw new Error("SECOND_REVIEW_TARGET_INVALID");
        }

        targetEditor = {
          email: target.email,
          fullName: target.fullName,
          id: target.id,
        };
      }

      const now = new Date();
      let shouldNotifyTarget = false;

      if (!existingAssignment) {
        await transaction.editorReviewAssignment.create({
          data: {
            assignedAt: targetEditor ? now : null,
            completedAt: null,
            editorId: targetEditor?.id ?? null,
            invitedEmail: null,
            source: mode === "pool" ? "pool" : "specific_editor",
            stage: "second",
            startedAt: null,
            status: targetEditor ? "assigned" : "waiting",
            workId: work.id,
          },
        });
        shouldNotifyTarget = Boolean(targetEditor);
      } else if (
        existingAssignment.source === "pool" &&
        existingAssignment.status === "waiting" &&
        existingAssignment.editorId === null &&
        targetEditor
      ) {
        await transaction.editorReviewAssignment.update({
          where: { id: existingAssignment.id },
          data: {
            assignedAt: now,
            completedAt: null,
            editorId: targetEditor.id,
            invitedEmail: null,
            source: "specific_editor",
            startedAt: null,
            status: "assigned",
          },
        });
        shouldNotifyTarget = true;
      } else if (
        !(
          mode === "pool" &&
          existingAssignment.source === "pool" &&
          existingAssignment.status === "waiting" &&
          existingAssignment.editorId === null
        )
      ) {
        throw new Error("SECOND_REVIEW_ALREADY_ASSIGNED");
      }

      await transaction.work.update({
        where: { id: work.id },
        data: {
          editorReviewStatus: targetEditor
            ? "second_in_progress"
            : "awaiting_second_editor",
        },
      });

      if (targetEditor && shouldNotifyTarget) {
        await transaction.notification.create({
          data: {
            message: `${work.title} adlı eser ikinci editör incelemesi için size atandı.`,
            relatedEntityId: work.id,
            relatedEntityType: "work",
            title: "İkinci editör görevi",
            type: "editor_recommendation",
            userId: targetEditor.id,
          },
        });
      }

      return {
        slug: work.slug,
        targetEditor,
        title: work.title,
        workId: work.id,
      };
    });

    if (result.targetEditor) {
      try {
        await sendSecondEditorAssignmentEmail({
          editorName: result.targetEditor.fullName,
          email: result.targetEditor.email,
          workId: result.workId,
          workTitle: result.title,
        });
      } catch (emailError) {
        console.error("EDITOR_EMAIL_DELIVERY_FAILED", {
          event: "second_editor_assigned",
          workId: result.workId,
          error: emailError instanceof Error ? emailError.message : "UNKNOWN_ERROR",
        });
      }
    }

    refreshEditorFlow(result.slug);

    return {
      status: "success",
      message: result.targetEditor
        ? `Eser ${result.targetEditor.fullName} adlı editöre gönderildi.`
        : "Eser ikinci editör genel havuzuna bırakıldı.",
    };
  } catch (error) {
    console.error("SECOND_EDITOR_ASSIGNMENT_FAILED", {
      error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
    });

    return {
      status: "error",
      message: "İkinci editör görevi oluşturulamadı.",
    };
  }
}

/** Genel havuzdaki ikinci editör görevini yarış durumuna güvenli biçimde alır. */
export async function claimSecondEditorReviewAction(
  _state: EditorActionState,
  formData: FormData,
): Promise<EditorActionState> {
  try {
    const sessionEditor = await requireEditorSession();
    const workId = value(formData, "workId");

    if (!workId) {
      return {
        status: "error",
        message: "Eser bilgisi bulunamadı.",
      };
    }

    const result = await prisma.$transaction(async (transaction) => {
      const editor = await lockLiveEditor(transaction, sessionEditor.id);
      await lockSecondReviewWorkState(transaction, workId);

      const work = await transaction.work.findUnique({
        where: { id: workId },
        select: {
          assignedEditorId: true,
          authorId: true,
          editorReviewStatus: true,
          slug: true,
        },
      });
      const firstAssignment = await transaction.editorReviewAssignment.findUnique({
        where: {
          workId_stage: {
            workId,
            stage: "first",
          },
        },
        select: { status: true },
      });
      const secondAssignment = await transaction.editorReviewAssignment.findUnique({
        where: {
          workId_stage: {
            workId,
            stage: "second",
          },
        },
        select: {
          editorId: true,
          id: true,
          source: true,
          status: true,
        },
      });

      const canClaim =
        Boolean(work) &&
        work?.editorReviewStatus === "awaiting_second_editor" &&
        work.assignedEditorId !== editor.id &&
        work.authorId !== editor.id &&
        firstAssignment?.status === "completed" &&
        secondAssignment?.editorId === null &&
        secondAssignment?.source === "pool" &&
        secondAssignment?.status === "waiting";

      if (!canClaim || !work || !secondAssignment) {
        return null;
      }

      const now = new Date();
      await transaction.editorReviewAssignment.update({
        where: { id: secondAssignment.id },
        data: {
          assignedAt: now,
          editorId: editor.id,
          startedAt: now,
          status: "in_progress",
        },
      });

      await transaction.work.update({
        where: { id: workId },
        data: {
          editorReviewStatus: "second_in_progress",
        },
      });

      return {
        slug: work.slug,
      };
    });

    if (!result) {
      return {
        status: "error",
        message: "Bu görev başka bir editör tarafından alınmış olabilir.",
      };
    }

    refreshEditorFlow(result.slug);

    return {
      status: "success",
      message: "İkinci editör görevi panelinize eklendi.",
    };
  } catch (error) {
    console.error("SECOND_EDITOR_CLAIM_FAILED", {
      error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
    });

    return {
      status: "error",
      message: "Görev alınamadı.",
    };
  }
}
