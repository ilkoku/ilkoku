"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/current-user";
import {
  sendAuthorSecondEditorStatusEmail,
  sendExternalEditorInvitationEmail,
  sendFirstEditorSecondReviewStatusEmail,
} from "@/lib/email/editor-emails";
import { prisma } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/site-url";
import {
  claimProfessionalReviewAction as claimProfessionalReviewCoreAction,
  completeProfessionalReviewAction as completeProfessionalReviewCoreAction,
} from "./actions";
import {
  claimSecondEditorReviewAction as claimSecondEditorReviewEmailAction,
  completeSecondEditorReviewAction as completeSecondEditorReviewEmailAction,
  sendToSecondEditorAction as sendToSecondEditorEmailAction,
} from "./second-editor-email.actions";
import type { EditorActionState } from "./types";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function normalizedEmail(input: string) {
  return input.trim().toLowerCase();
}

function validEmail(input: string) {
  return /^\S+@\S+\.\S+$/u.test(input);
}

async function requireActiveEditor() {
  const user = await getCurrentUser();

  if (!user || user.role !== "editor" || user.status !== "active") {
    throw new Error("EDITOR_PERMISSION_REQUIRED");
  }

  return user;
}

function refreshEditorWorkflow(workSlug?: string) {
  revalidatePath("/editor/talepler");
  revalidatePath("/editor/incelemeler");
  revalidatePath("/editor/bildirimler");
  revalidatePath("/yazar");
  revalidatePath("/eserlerim");
  revalidatePath("/geri-bildirimler");

  if (workSlug) {
    revalidatePath(`/kitap/${workSlug}`);
    revalidatePath(`/oku/${workSlug}`);
  }
}

async function writeEditorAuditSafely(input: {
  actorId: string;
  newStatus: string;
  oldStatus: string;
  recipient?: string;
  source: string;
  workId: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        action: "work_status_changed",
        actorId: input.actorId,
        entityId: input.workId,
        entityType: "Work",
        metadata: JSON.stringify({
          newStatus: input.newStatus,
          oldStatus: input.oldStatus,
          ...(input.recipient ? { recipient: input.recipient } : {}),
          source: input.source,
        }),
      },
    });
  } catch (error) {
    console.error("EDITOR_AUDIT_LOG_FAILED", {
      error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
      source: input.source,
      workId: input.workId,
    });
  }
}

export async function claimProfessionalReviewAction(
  state: EditorActionState,
  formData: FormData,
): Promise<EditorActionState> {
  const workId = value(formData, "workId");
  const result = await claimProfessionalReviewCoreAction(state, formData);

  if (result.status === "success" && workId) {
    const editor = await getCurrentUser();

    if (editor) {
      await writeEditorAuditSafely({
        actorId: editor.id,
        newStatus: "in_progress",
        oldStatus: "requested",
        source: "editor_first_review_claimed",
        workId,
      });
    }
  }

  return result;
}

export async function completeProfessionalReviewAction(
  state: EditorActionState,
  formData: FormData,
): Promise<EditorActionState> {
  const workId = value(formData, "workId");
  const intent = value(formData, "intent");
  const result = await completeProfessionalReviewCoreAction(state, formData);

  if (result.status === "success" && workId) {
    const editor = await getCurrentUser();

    if (editor) {
      await writeEditorAuditSafely({
        actorId: editor.id,
        newStatus:
          intent === "second" ? "awaiting_second_editor" : "completed",
        oldStatus: "in_progress",
        source:
          intent === "second"
            ? "editor_first_review_completed_for_second"
            : "editor_first_review_completed",
        workId,
      });
    }
  }

  return result;
}

export async function claimSecondEditorReviewAction(
  state: EditorActionState,
  formData: FormData,
): Promise<EditorActionState> {
  const workId = value(formData, "workId");
  const result = await claimSecondEditorReviewEmailAction(state, formData);

  if (result.status === "success" && workId) {
    const editor = await getCurrentUser();

    if (editor) {
      await writeEditorAuditSafely({
        actorId: editor.id,
        newStatus: "second_in_progress",
        oldStatus: "awaiting_second_editor",
        source: "editor_second_review_claimed",
        workId,
      });
    }
  }

  return result;
}

export async function completeSecondEditorReviewAction(
  state: EditorActionState,
  formData: FormData,
): Promise<EditorActionState> {
  const workId = value(formData, "workId");
  const result = await completeSecondEditorReviewEmailAction(state, formData);

  if (result.status === "success" && workId) {
    const editor = await getCurrentUser();

    if (editor) {
      await writeEditorAuditSafely({
        actorId: editor.id,
        newStatus: "completed",
        oldStatus: "second_in_progress",
        source: "editor_second_review_completed",
        workId,
      });
    }
  }

  return result;
}

async function inviteExternalSecondEditorAction(
  formData: FormData,
): Promise<EditorActionState> {
  try {
    const sender = await requireActiveEditor();
    const workId = value(formData, "workId");
    const email = normalizedEmail(value(formData, "externalEmail"));

    if (!workId || !validEmail(email)) {
      return {
        message: "Dış editör için geçerli bir e-posta adresi yazın.",
        status: "error",
      };
    }

    const work = await prisma.work.findFirst({
      where: {
        assignedEditorId: sender.id,
        editorReviewAssignments: {
          some: {
            editorId: sender.id,
            stage: "first",
            status: "completed",
          },
        },
        editorReviewStatus: "awaiting_second_editor",
        id: workId,
      },
      select: {
        authorId: true,
        id: true,
        slug: true,
        title: true,
      },
    });

    if (!work) {
      return {
        message: "Bu eser dış ikinci editör davetine hazır değil.",
        status: "error",
      };
    }

    const conflictingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (
      conflictingUser &&
      (conflictingUser.id === sender.id || conflictingUser.id === work.authorId)
    ) {
      return {
        message: "Eser yazarı veya birinci editör ikinci editör olarak davet edilemez.",
        status: "error",
      };
    }

    const rawToken = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.$transaction(async (transaction) => {
      const secondAssignment =
        await transaction.editorReviewAssignment.findUnique({
          where: {
            workId_stage: {
              stage: "second",
              workId: work.id,
            },
          },
          select: {
            editorId: true,
            id: true,
            source: true,
            status: true,
          },
        });

      if (!secondAssignment) {
        await transaction.editorReviewAssignment.create({
          data: {
            editorId: null,
            invitedEmail: email,
            source: "external_invite",
            stage: "second",
            status: "waiting",
            workId: work.id,
          },
        });
      } else if (
        secondAssignment.editorId === null &&
        secondAssignment.status === "waiting" &&
        (secondAssignment.source === "pool" ||
          secondAssignment.source === "external_invite")
      ) {
        const updated = await transaction.editorReviewAssignment.updateMany({
          where: {
            editorId: null,
            id: secondAssignment.id,
            status: "waiting",
          },
          data: {
            assignedAt: null,
            completedAt: null,
            invitedEmail: email,
            source: "external_invite",
            startedAt: null,
          },
        });

        if (updated.count !== 1) {
          throw new Error("SECOND_REVIEW_ASSIGNMENT_CHANGED");
        }
      } else {
        throw new Error("SECOND_REVIEW_ALREADY_ASSIGNED");
      }

      await transaction.editorInvite.updateMany({
        where: {
          invitedEmail: { not: email },
          usedAt: null,
          workId: work.id,
        },
        data: {
          expiresAt: new Date(),
        },
      });

      await transaction.editorInvite.upsert({
        where: {
          workId_invitedEmail: {
            invitedEmail: email,
            workId: work.id,
          },
        },
        create: {
          expiresAt,
          invitedById: sender.id,
          invitedEmail: email,
          tokenHash,
          workId: work.id,
        },
        update: {
          acceptedById: null,
          expiresAt,
          invitedById: sender.id,
          tokenHash,
          usedAt: null,
        },
      });

      await transaction.auditLog.create({
        data: {
          action: "work_status_changed",
          actorId: sender.id,
          entityId: work.id,
          entityType: "Work",
          metadata: JSON.stringify({
            newStatus: "awaiting_second_editor",
            oldStatus: "awaiting_second_editor",
            recipient: email,
            source: "external_second_editor_invited",
          }),
        },
      });
    });

    const inviteUrl = new URL(`/editor-daveti/${rawToken}`, getSiteUrl());

    try {
      await sendExternalEditorInvitationEmail({
        email,
        inviterName: sender.fullName,
        inviteUrl: inviteUrl.toString(),
        workTitle: work.title,
      });
    } catch (emailError) {
      console.error("EDITOR_EMAIL_DELIVERY_FAILED", {
        error:
          emailError instanceof Error ? emailError.message : "UNKNOWN_ERROR",
        event: "external_second_editor_invitation",
        workId: work.id,
      });
    }

    refreshEditorWorkflow(work.slug);

    return {
      inviteUrl: inviteUrl.toString(),
      message: "Dış ikinci editör daveti oluşturuldu ve e-posta kuyruğuna alındı.",
      status: "success",
    };
  } catch (error) {
    console.error("EXTERNAL_SECOND_EDITOR_INVITE_FAILED", error);

    return {
      message:
        error instanceof Error &&
        error.message === "SECOND_REVIEW_ALREADY_ASSIGNED"
          ? "Bu eser için ikinci editör görevi daha önce oluşturulmuş."
          : "Dış ikinci editör daveti oluşturulamadı.",
      status: "error",
    };
  }
}

export async function sendToSecondEditorAction(
  state: EditorActionState,
  formData: FormData,
): Promise<EditorActionState> {
  const mode = value(formData, "mode");
  const workId = value(formData, "workId");

  if (mode === "external") {
    return inviteExternalSecondEditorAction(formData);
  }

  const result = await sendToSecondEditorEmailAction(state, formData);

  if (result.status === "success" && workId) {
    const editor = await getCurrentUser();

    if (editor) {
      await writeEditorAuditSafely({
        actorId: editor.id,
        newStatus:
          mode === "specific"
            ? "second_in_progress"
            : "awaiting_second_editor",
        oldStatus: "awaiting_second_editor",
        source:
          mode === "specific"
            ? "editor_second_review_assigned_specific"
            : "editor_second_review_opened_pool",
        workId,
      });
    }
  }

  return result;
}

export async function acceptExternalSecondEditorInviteAction(
  _state: EditorActionState,
  formData: FormData,
): Promise<EditorActionState> {
  try {
    const editor = await requireActiveEditor();
    const rawToken = value(formData, "token");

    if (!rawToken) {
      return { message: "Davet bağlantısı geçersiz.", status: "error" };
    }

    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const now = new Date();
    const invite = await prisma.editorInvite.findFirst({
      where: {
        expiresAt: { gt: now },
        invitedEmail: editor.email.trim().toLowerCase(),
        tokenHash,
      },
      select: {
        acceptedById: true,
        id: true,
        usedAt: true,
        workId: true,
      },
    });

    if (
      !invite ||
      (invite.usedAt && invite.acceptedById !== editor.id)
    ) {
      return {
        message: "Bu davet geçersiz, süresi dolmuş veya başka bir hesap tarafından kullanılmış.",
        status: "error",
      };
    }

    const accepted = await prisma.$transaction(async (transaction) => {
      const [work, firstAssignment, secondAssignment] = await Promise.all([
        transaction.work.findUnique({
          where: { id: invite.workId },
          select: {
            assignedEditor: {
              select: {
                email: true,
                fullName: true,
                id: true,
              },
            },
            assignedEditorId: true,
            author: {
              select: {
                email: true,
                fullName: true,
                id: true,
              },
            },
            authorId: true,
            editorReviewStatus: true,
            id: true,
            slug: true,
            title: true,
          },
        }),
        transaction.editorReviewAssignment.findUnique({
          where: {
            workId_stage: {
              stage: "first",
              workId: invite.workId,
            },
          },
          select: { status: true },
        }),
        transaction.editorReviewAssignment.findUnique({
          where: {
            workId_stage: {
              stage: "second",
              workId: invite.workId,
            },
          },
          select: {
            editorId: true,
            id: true,
            invitedEmail: true,
            source: true,
            status: true,
          },
        }),
      ]);

      if (!work || !firstAssignment || !secondAssignment) {
        throw new Error("SECOND_REVIEW_INVITE_STATE_MISSING");
      }

      if (
        secondAssignment.editorId === editor.id &&
        secondAssignment.status === "in_progress" &&
        work.editorReviewStatus === "second_in_progress"
      ) {
        return { alreadyAccepted: true, work };
      }

      const canAccept =
        work.editorReviewStatus === "awaiting_second_editor" &&
        firstAssignment.status === "completed" &&
        work.assignedEditorId !== editor.id &&
        work.authorId !== editor.id &&
        secondAssignment.editorId === null &&
        secondAssignment.invitedEmail?.trim().toLowerCase() ===
          editor.email.trim().toLowerCase() &&
        secondAssignment.source === "external_invite" &&
        secondAssignment.status === "waiting";

      if (!canAccept) {
        throw new Error("SECOND_REVIEW_INVITE_NOT_ACCEPTABLE");
      }

      const assignmentUpdated =
        await transaction.editorReviewAssignment.updateMany({
          where: {
            editorId: null,
            id: secondAssignment.id,
            invitedEmail: editor.email.trim().toLowerCase(),
            source: "external_invite",
            stage: "second",
            status: "waiting",
            workId: work.id,
          },
          data: {
            assignedAt: now,
            editorId: editor.id,
            startedAt: now,
            status: "in_progress",
          },
        });

      if (assignmentUpdated.count !== 1) {
        throw new Error("SECOND_REVIEW_INVITE_RACE_LOST");
      }

      const workUpdated = await transaction.work.updateMany({
        where: {
          assignedEditorId: { not: editor.id },
          authorId: { not: editor.id },
          editorReviewStatus: "awaiting_second_editor",
          id: work.id,
        },
        data: {
          editorReviewStatus: "second_in_progress",
        },
      });

      if (workUpdated.count !== 1) {
        throw new Error("SECOND_REVIEW_WORK_STATE_CHANGED");
      }

      const inviteUpdated = await transaction.editorInvite.updateMany({
        where: {
          id: invite.id,
          OR: [
            { acceptedById: null, usedAt: null },
            { acceptedById: editor.id },
          ],
        },
        data: {
          acceptedById: editor.id,
          usedAt: invite.usedAt ?? now,
        },
      });

      if (inviteUpdated.count !== 1) {
        throw new Error("SECOND_REVIEW_INVITE_ALREADY_USED");
      }

      const notifications = [
        transaction.notification.create({
          data: {
            message: `${work.title} adlı eseriniz için dış ikinci editör bağımsız incelemeye başladı.`,
            relatedEntityId: work.id,
            relatedEntityType: "work",
            title: "Dış ikinci editör incelemesi başladı",
            type: "editor_review",
            userId: work.author.id,
          },
        }),
      ];

      if (work.assignedEditor) {
        notifications.push(
          transaction.notification.create({
            data: {
              message: `${work.title} adlı eser için dış ikinci editör daveti kabul edildi.`,
              relatedEntityId: work.id,
              relatedEntityType: "work",
              title: "Dış ikinci editör görevi başladı",
              type: "editor_review",
              userId: work.assignedEditor.id,
            },
          }),
        );
      }

      await Promise.all(notifications);

      await transaction.auditLog.create({
        data: {
          action: "work_status_changed",
          actorId: editor.id,
          entityId: work.id,
          entityType: "Work",
          metadata: JSON.stringify({
            newStatus: "second_in_progress",
            oldStatus: "awaiting_second_editor",
            recipient: editor.email,
            source: "external_second_editor_invite_accepted",
          }),
        },
      });

      return { alreadyAccepted: false, work };
    });

    if (!accepted.alreadyAccepted) {
      try {
        await sendAuthorSecondEditorStatusEmail({
          email: accepted.work.author.email,
          fullName: accepted.work.author.fullName,
          stage: "started",
          workId: accepted.work.id,
          workTitle: accepted.work.title,
        });
      } catch (emailError) {
        console.error("EDITOR_EMAIL_DELIVERY_FAILED", {
          error:
            emailError instanceof Error ? emailError.message : "UNKNOWN_ERROR",
          event: "author_external_second_editor_started",
          workId: accepted.work.id,
        });
      }

      if (accepted.work.assignedEditor) {
        try {
          await sendFirstEditorSecondReviewStatusEmail({
            editorName: accepted.work.assignedEditor.fullName,
            email: accepted.work.assignedEditor.email,
            stage: "started",
            workId: accepted.work.id,
            workTitle: accepted.work.title,
          });
        } catch (emailError) {
          console.error("EDITOR_EMAIL_DELIVERY_FAILED", {
            error:
              emailError instanceof Error ? emailError.message : "UNKNOWN_ERROR",
            event: "first_editor_external_second_review_started",
            workId: accepted.work.id,
          });
        }
      }
    }

    refreshEditorWorkflow(accepted.work.slug);

    return {
      message: accepted.alreadyAccepted
        ? "Bu dış ikinci editör görevini daha önce kabul ettiniz."
        : "Dış ikinci editör görevi panelinize eklendi.",
      status: "success",
    };
  } catch (error) {
    console.error("EXTERNAL_SECOND_EDITOR_ACCEPT_FAILED", error);

    return {
      message: "Dış ikinci editör görevi kabul edilemedi.",
      status: "error",
    };
  }
}
