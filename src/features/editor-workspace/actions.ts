"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/site-url";
import { completedPublishedWorkWhere } from "./eligibility";
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
        id: workId,
      },
      select: {
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
      const updated = await transaction.work.updateMany({
        where: {
          ...completedPublishedWorkWhere,
          assignedEditorId: null,
          editorReviewStatus: {
            in: ["not_requested", "requested"],
          },
          id: work.id,
        },
        data: {
          assignedAt: claimedAt,
          assignedEditorId: editor.id,
          editorReviewStatus: "in_progress",
        },
      });

      if (updated.count !== 1) return false;

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

export async function saveProfessionalReviewDraftAction(
  _state: EditorActionState,
  formData: FormData,
): Promise<EditorActionState> {
  try {
    const editor = await requireEditor();
    const workId = text(formData, "workId");
    const values = reviewValues(formData);

    const work = await prisma.work.findFirst({
      where: {
        assignedEditorId: editor.id,
        editorReviewStatus: "in_progress",
        id: workId,
      },
      select: {
        authorId: true,
        id: true,
        slug: true,
      },
    });

    if (!work) {
      return {
        message: "Bu eser için profesyonel inceleme yetkiniz bulunmuyor.",
        status: "error",
      };
    }

    const existing = await prisma.editorFeedback.findFirst({
      where: {
        editorId: editor.id,
        isProfessionalReview: true,
        workId: work.id,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      await prisma.editorFeedback.update({
        where: {
          id: existing.id,
        },
        data: {
          ...values,
          reportStatus: "draft",
        },
      });
    } else {
      await prisma.editorFeedback.create({
        data: {
          ...values,
          authorId: work.authorId,
          editorId: editor.id,
          isProfessionalReview: true,
          reportStatus: "draft",
          workId: work.id,
        },
      });
    }

    revalidateEditorWork(work.slug);

    return {
      message: "İnceleme taslağı kaydedildi.",
      status: "success",
    };
  } catch {
    return idleError;
  }
}

export async function completeProfessionalReviewAction(
  _state: EditorActionState,
  formData: FormData,
): Promise<EditorActionState> {
  try {
    const editor = await requireEditor();
    const workId = text(formData, "workId");
    const values = reviewValues(formData);
    const completedAt = new Date();

    const work = await prisma.work.findFirst({
      where: {
        assignedEditorId: editor.id,
        editorReviewStatus: "in_progress",
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
        message: "Bu eser için tamamlanabilir bir inceleme bulunmuyor.",
        status: "error",
      };
    }

    await prisma.$transaction(async (transaction) => {
      const completed = await transaction.work.updateMany({
        where: {
          assignedEditorId: editor.id,
          editorReviewStatus: "in_progress",
          id: work.id,
        },
        data: {
          editorReviewCompletedAt: completedAt,
          editorReviewStatus: "completed",
        },
      });

      if (completed.count !== 1) {
        throw new Error("REVIEW_ALREADY_COMPLETED");
      }

      const existing = await transaction.editorFeedback.findFirst({
        where: {
          editorId: editor.id,
          isProfessionalReview: true,
          workId: work.id,
        },
        select: {
          id: true,
        },
      });

      if (existing) {
        await transaction.editorFeedback.update({
          where: {
            id: existing.id,
          },
          data: {
            ...values,
            reportStatus: "completed",
          },
        });
      } else {
        await transaction.editorFeedback.create({
          data: {
            ...values,
            authorId: work.authorId,
            editorId: editor.id,
            isProfessionalReview: true,
            reportStatus: "completed",
            workId: work.id,
          },
        });
      }

      await transaction.notification.create({
        data: {
          message: `${work.title} adlı eserinizin profesyonel editör incelemesi tamamlandı.`,
          relatedEntityId: work.id,
          relatedEntityType: "work",
          title: "Profesyonel inceleme tamamlandı",
          type: "editor_review",
          userId: work.authorId,
        },
      });
    });

    revalidateEditorWork(work.slug);
    revalidatePath("/geri-bildirimler");
    revalidatePath("/yazar");
    revalidatePath("/eserlerim");

    return {
      message: "Profesyonel inceleme tamamlandı ve yazara bildirildi.",
      status: "success",
    };
  } catch {
    return idleError;
  }
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

    return {
      inviteUrl: inviteUrl.toString(),
      message:
        "Güvenli davet oluşturuldu. E-posta teslim altyapısı yapılandırılana kadar bağlantıyı güvenli biçimde paylaşın.",
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
}
