"use server";

import {
  sendAuthorEditorStatusEmail,
  sendEditorRecommendationEmail,
  sendExternalEditorInvitationEmail,
} from "@/lib/email/editor-emails";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/site-url";
import { completedPublishedWorkWhere } from "./eligibility";
import {
  completeFirstEditorReviewStateAction,
  saveFirstEditorReviewDraftAction,
} from "./first-editor-review-state.actions";
import type { EditorActionState } from "./types";

const idleError: EditorActionState = {
  message: "İşlem tamamlanamadı. Lütfen yeniden deneyin.",
  status: "error",
};

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function normalizedEmail(value: string) {
  return value.trim().toLowerCase();
}

function validEmail(value: string) {
  return /^\S+@\S+\.\S+$/u.test(value);
}

async function requireEditor() {
  const user = await getCurrentUser();

  if (!user || user.role !== "editor" || user.status !== "active") {
    throw new Error("EDITOR_PERMISSION_REQUIRED");
  }

  return user;
}

function revalidateEditorWork(workSlug?: string) {
  revalidatePath("/editor/kesfet");
  revalidatePath("/editor/talepler");
  revalidatePath("/editor/favoriler");
  revalidatePath("/editor/seckiler");
  revalidatePath("/editor/incelemeler");
  revalidatePath("/editor/onerilenler");
  revalidatePath("/editor/bildirimler");

  if (workSlug) {
    revalidatePath(`/kitap/${workSlug}`);
    revalidatePath(`/oku/${workSlug}`);
  }
}

export async function toggleEditorFavoriteAction(
  formData: FormData,
): Promise<void> {
  const editor = await requireEditor();
  const workId = text(formData, "workId");

  if (!workId) throw new Error("WORK_ID_REQUIRED");

  const work = await prisma.work.findFirst({
    where: {
      ...completedPublishedWorkWhere,
      id: workId,
    },
    select: {
      id: true,
      slug: true,
    },
  });

  if (!work) throw new Error("WORK_NOT_AVAILABLE");

  const existing = await prisma.editorFavorite.findUnique({
    where: {
      editorId_workId: {
        editorId: editor.id,
        workId: work.id,
      },
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    await prisma.editorFavorite.delete({
      where: {
        id: existing.id,
      },
    });
  } else {
    await prisma.editorFavorite.create({
      data: {
        editorId: editor.id,
        workId: work.id,
      },
    });
  }

  revalidateEditorWork(work.slug);
}

export async function claimProfessionalReviewAction(
  _state: EditorActionState,
  formData: FormData,
): Promise<EditorActionState> {
  try {
    const editor = await requireEditor();
    const workId = text(formData, "workId");

    if (!workId) return idleError;

    const work = await prisma.work.findFirst({
      where: {
        ...completedPublishedWorkWhere,
        assignedEditorId: null,
        authorId: {
          not: editor.id,
        },
        editorReviewAssignments: {
          some: {
            editorId: null,
            source: "pool",
            stage: "first",
            status: "waiting",
          },
        },
        editorReviewStatus: "requested",
        id: workId,
      },
      select: {
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
    });

    if (!work) {
      return {
        message:
          "Yalnızca tamamlanmış ve yayımlanmış eserler profesyonel incelemeye alınabilir.",
        status: "error",
      };
    }

    const claimedAt = new Date();

    const result = await prisma.$transaction(async (transaction) => {
      const assignmentUpdated =
        await transaction.editorReviewAssignment.updateMany({
          where: {
            editorId: null,
            source: "pool",
            stage: "first",
            status: "waiting",
            workId: work.id,
            work: {
              ...completedPublishedWorkWhere,
              assignedEditorId: null,
              authorId: {
                not: editor.id,
              },
              editorReviewStatus: "requested",
            },
          },
          data: {
            assignedAt: claimedAt,
            completedAt: null,
            editorId: editor.id,
            invitedEmail: null,
            startedAt: claimedAt,
            status: "in_progress",
          },
        });

      if (assignmentUpdated.count !== 1) {
        return false;
      }

      const workUpdated =
        await transaction.work.updateMany({
          where: {
            ...completedPublishedWorkWhere,
            assignedEditorId: null,
            authorId: {
              not: editor.id,
            },
            editorReviewAssignments: {
              some: {
                editorId: editor.id,
                source: "pool",
                stage: "first",
                status: "in_progress",
              },
            },
            editorReviewStatus: "requested",
            id: work.id,
          },
          data: {
            assignedAt: claimedAt,
            assignedEditorId: editor.id,
            editorReviewStatus: "in_progress",
          },
        });

      if (workUpdated.count !== 1) {
        throw new Error(
          "FIRST_REVIEW_WORK_STATE_CHANGED",
        );
      }

      await transaction.notification.create({
        data: {
          message: `${work.title} adlı eseriniz profesyonel editör incelemesine alındı.`,
          relatedEntityId: work.id,
          relatedEntityType: "work",
          title: "Editör eserinizi seçti",
          type: "editor_review",
          userId: work.authorId,
        },
      });

      return true;
    });

    if (!result) {
      return {
        message: "Bu eser başka bir editör tarafından incelemeye alınmış.",
        status: "error",
      };
    }

    try {
      await sendAuthorEditorStatusEmail({
        email: work.author.email,
        fullName: work.author.fullName,
        stage: "claimed",
        workId: work.id,
        workTitle: work.title,
      });
    } catch (emailError) {
      console.error(
        "EDITOR_EMAIL_DELIVERY_FAILED",
        {
          event: "first_review_claimed",
          workId: work.id,
          error:
            emailError instanceof Error
              ? emailError.message
              : "UNKNOWN_ERROR",
        },
      );
    }

    revalidateEditorWork(work.slug);
    revalidatePath("/yazar");
    revalidatePath("/eserlerim");

    return {
      message: "Eser profesyonel incelemelerinize eklendi.",
      status: "success",
    };
  } catch {
    return idleError;
  }
}

/**
 * Legacy action id compatibility: old clients still land on the canonical,
 * row-locked first-editor state machine.
 */
export async function saveProfessionalReviewDraftAction(
  state: EditorActionState,
  formData: FormData,
): Promise<EditorActionState> {
  return saveFirstEditorReviewDraftAction(state, formData);
}

/**
 * Legacy action id compatibility: completion is delegated to the canonical,
 * terminal-state-safe first-editor state machine.
 */
export async function completeProfessionalReviewAction(
  state: EditorActionState,
  formData: FormData,
): Promise<EditorActionState> {
  return completeFirstEditorReviewStateAction(state, formData);
}

export async function recommendWorkToEditorAction(
  _state: EditorActionState,
  formData: FormData,
): Promise<EditorActionState> {
  try {
    const sender = await requireEditor();
    const workId = text(formData, "workId");
    const recipient = text(formData, "recipient");
    const email = normalizedEmail(recipient);

    if (!workId || recipient.length < 2) {
      return {
        message: "Eser ve editör bilgisi gereklidir.",
        status: "error",
      };
    }

    const work = await prisma.work.findFirst({
      where: {
        ...completedPublishedWorkWhere,
        id: workId,
      },
      select: {
        id: true,
        title: true,
      },
    });

    if (!work) {
      return {
        message: "Önerilecek eser artık erişilebilir değil.",
        status: "error",
      };
    }

    const registeredEditor = await prisma.user.findFirst({
      where: {
        id: {
          not: sender.id,
        },
        role: "editor",
        status: "active",
        OR: [
          {
            email,
          },
          {
            displayName: {
              contains: recipient,
            },
          },
          {
            fullName: {
              contains: recipient,
            },
          },
        ],
      },
      select: {
        email: true,
        fullName: true,
        id: true,
      },
    });

    if (registeredEditor) {
      const duplicate = await prisma.editorRecommendation.findUnique({
        where: {
          senderEditorId_recipientEditorId_workId: {
            recipientEditorId: registeredEditor.id,
            senderEditorId: sender.id,
            workId: work.id,
          },
        },
        select: {
          id: true,
        },
      });

      if (duplicate) {
        return {
          message: "Bu eseri aynı editöre daha önce önerdiniz.",
          status: "error",
        };
      }

      await prisma.$transaction([
        prisma.editorRecommendation.create({
          data: {
            recipientEditorId: registeredEditor.id,
            senderEditorId: sender.id,
            workId: work.id,
          },
        }),
        prisma.notification.create({
          data: {
            message: `${sender.fullName}, ${work.title} adlı eseri size önerdi.`,
            relatedEntityId: work.id,
            relatedEntityType: "work",
            title: "Bir editör size eser önerdi",
            type: "editor_recommendation",
            userId: registeredEditor.id,
          },
        }),
      ]);

      try {
        await sendEditorRecommendationEmail({
          editorName: registeredEditor.fullName,
          email: registeredEditor.email,
          senderName: sender.fullName,
          workId: work.id,
          workTitle: work.title,
        });
      } catch (emailError) {
        console.error(
          "EDITOR_EMAIL_DELIVERY_FAILED",
          {
            event: "registered_editor_recommendation",
            workId: work.id,
            error:
              emailError instanceof Error
                ? emailError.message
                : "UNKNOWN_ERROR",
          },
        );
      }

      revalidatePath("/editor/onerilenler");
      revalidatePath("/editor/bildirimler");

      return {
        message: "Eser editöre önerildi.",
        status: "success",
      };
    }

    if (!validEmail(email)) {
      return {
        message:
          "Kayıtlı editör bulunamadı. Davet için geçerli bir e-posta yazın.",
        status: "error",
      };
    }

    const existingInvite = await prisma.editorInvite.findUnique({
      where: {
        workId_invitedEmail: {
          invitedEmail: email,
          workId: work.id,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingInvite) {
      return {
        message: "Bu eser için aynı e-posta adresine daha önce davet oluşturuldu.",
        status: "error",
      };
    }

    const rawToken = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");

    await prisma.editorInvite.create({
      data: {
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        invitedById: sender.id,
        invitedEmail: email,
        tokenHash,
        workId: work.id,
      },
    });

    const inviteUrl = new URL("/kayit", getSiteUrl());
    inviteUrl.searchParams.set("davet", rawToken);

    try {
      await sendExternalEditorInvitationEmail({
        email,
        inviterName: sender.fullName,
        inviteUrl: inviteUrl.toString(),
        workTitle: work.title,
      });
    } catch (emailError) {
      console.error(
        "EDITOR_EMAIL_DELIVERY_FAILED",
        {
          event: "external_editor_invitation",
          workId: work.id,
          error:
            emailError instanceof Error
              ? emailError.message
              : "UNKNOWN_ERROR",
        },
      );
    }

    return {
      inviteUrl: inviteUrl.toString(),
      message:
        "Güvenli editör daveti oluşturuldu ve e-posta teslimat kuyruğuna alındı.",
      status: "success",
    };
  } catch {
    return idleError;
  }
}

export async function markNotificationReadAction(
  formData: FormData,
): Promise<void> {
  const user = await getCurrentUser();
  const notificationId = text(formData, "notificationId");

  if (!user || !notificationId) {
    throw new Error("NOTIFICATION_PERMISSION_REQUIRED");
  }

  await prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId: user.id,
    },
    data: {
      readAt: new Date(),
    },
  });

  revalidatePath("/editor/bildirimler");
  const returnPath = text(formData, "returnPath");
  if (returnPath === "/bildirimler") revalidatePath("/bildirimler");
}
